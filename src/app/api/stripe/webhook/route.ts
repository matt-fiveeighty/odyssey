import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, priceIdToPlanId } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createServerSupabase();

  // Stripe SDK types vary across versions — use loosely-typed access for
  // webhook event data objects which are guaranteed by Stripe's schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any;

  switch (event.type) {
    // ── Checkout completed → create/update subscription ────────────
    case "checkout.session.completed": {
      const userId = obj.metadata?.userId ?? obj.client_reference_id;
      const subId =
        typeof obj.subscription === "string"
          ? obj.subscription
          : obj.subscription?.id;
      if (!userId || !subId) break;

      const subResponse = await stripe.subscriptions.retrieve(subId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subResponse as any;

      const priceId = sub.items?.data?.[0]?.price?.id;
      const planId = priceId ? priceIdToPlanId(priceId) : null;

      if (planId) {
        const periodStart = sub.current_period_start;
        const periodEnd = sub.current_period_end;

        await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id:
              typeof obj.customer === "string"
                ? obj.customer
                : obj.customer?.id,
            stripe_subscription_id: sub.id,
            plan_id: planId,
            status: "active",
            current_period_start: periodStart
              ? new Date(periodStart * 1000).toISOString()
              : null,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

        await supabase.from("audit_log").insert({
          user_id: userId,
          action: "subscription_created",
          resource_type: "subscription",
          metadata: { plan_id: planId, stripe_subscription_id: sub.id },
        });
      }
      break;
    }

    // ── Subscription updated (upgrade, downgrade, renewal) ─────────
    case "customer.subscription.updated": {
      const userId = obj.metadata?.userId;
      if (!userId) break;

      const priceId = obj.items?.data?.[0]?.price?.id;
      const planId = priceId ? priceIdToPlanId(priceId) : null;
      const periodStart = obj.current_period_start;
      const periodEnd = obj.current_period_end;

      await supabase
        .from("subscriptions")
        .update({
          plan_id: planId ?? "free",
          status:
            obj.status === "active"
              ? "active"
              : obj.status === "past_due"
                ? "past_due"
                : "canceled",
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: obj.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      break;
    }

    // ── Subscription deleted (canceled + period ended) ─────────────
    case "customer.subscription.deleted": {
      const userId = obj.metadata?.userId;
      if (!userId) break;

      await supabase
        .from("subscriptions")
        .update({
          plan_id: "free",
          status: "canceled",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await supabase.from("audit_log").insert({
        user_id: userId,
        action: "subscription_canceled",
        resource_type: "subscription",
        metadata: { stripe_subscription_id: obj.id },
      });
      break;
    }

    // ── Payment failed → mark past_due ─────────────────────────────
    case "invoice.payment_failed": {
      const subRef =
        typeof obj.subscription === "string"
          ? obj.subscription
          : obj.subscription?.id;
      if (!subRef) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subDetails = (await stripe.subscriptions.retrieve(subRef)) as any;
      const userId = subDetails.metadata?.userId;
      if (!userId) break;

      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      break;
    }

    // ── Payment succeeded → reactivate ─────────────────────────────
    case "invoice.paid": {
      const subRef =
        typeof obj.subscription === "string"
          ? obj.subscription
          : obj.subscription?.id;
      if (!subRef) break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subDetails = (await stripe.subscriptions.retrieve(subRef)) as any;
      const userId = subDetails.metadata?.userId;
      if (!userId) break;

      await supabase
        .from("subscriptions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
