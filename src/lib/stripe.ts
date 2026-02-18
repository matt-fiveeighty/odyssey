import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  stripeInstance = new Stripe(key);
  return stripeInstance;
}

// ── Price IDs — set these in env or Stripe dashboard ───────────────

export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
  elite_monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY ?? "",
  elite_annual: process.env.STRIPE_PRICE_ELITE_ANNUAL ?? "",
} as const;

// Map Stripe price IDs to plan IDs
export function priceIdToPlanId(priceId: string): "pro" | "elite" | null {
  if (
    priceId === PRICE_IDS.pro_monthly ||
    priceId === PRICE_IDS.pro_annual
  ) return "pro";
  if (
    priceId === PRICE_IDS.elite_monthly ||
    priceId === PRICE_IDS.elite_annual
  ) return "elite";
  return null;
}
