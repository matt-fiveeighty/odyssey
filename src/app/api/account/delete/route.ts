import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const { reason } = body as { reason?: string };

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("deletion_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "confirmed", "processing"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "A deletion request is already in progress." },
      { status: 409 }
    );
  }

  const now = new Date();
  const confirmBy = new Date(now.getTime() + 7 * 86400000); // 7 days
  const deleteBy = new Date(now.getTime() + 30 * 86400000); // 30 days

  await supabase.from("deletion_requests").insert({
    user_id: user.id,
    status: "pending",
    reason: reason ?? null,
    confirm_by: confirmBy.toISOString(),
    delete_by: deleteBy.toISOString(),
  });

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "deletion_requested",
    resource_type: "account",
    metadata: { reason: reason ?? "none" },
  });

  return NextResponse.json({
    ok: true,
    message:
      "Deletion request created. Please confirm via email within 7 days. Your data will be deleted within 30 days of confirmation.",
    confirm_by: confirmBy.toISOString(),
  });
}

// Cancel a pending deletion request
export async function DELETE() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: pending } = await supabase
    .from("deletion_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (!pending) {
    return NextResponse.json(
      { error: "No pending deletion request found." },
      { status: 404 }
    );
  }

  await supabase
    .from("deletion_requests")
    .delete()
    .eq("id", pending.id);

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "deletion_canceled",
    resource_type: "account",
  });

  return NextResponse.json({ ok: true, message: "Deletion request canceled." });
}
