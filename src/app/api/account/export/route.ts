import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Check rate limit: 1 export per 24h
  const { data: recent } = await supabase
    .from("data_export_requests")
    .select("id, requested_at")
    .eq("user_id", user.id)
    .gte("requested_at", new Date(Date.now() - 86400000).toISOString())
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: "You can request one export per 24 hours." },
      { status: 429 }
    );
  }

  // Gather all user data
  const [profile, wizardState, assessments, goals] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("wizard_state").select("*").eq("user_id", user.id),
    supabase.from("assessments").select("*").eq("user_id", user.id),
    supabase.from("user_goals").select("*").eq("user_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile.data,
    wizard_state: wizardState.data,
    assessments: assessments.data,
    goals: goals.data,
  };

  // Create export request record
  await supabase.from("data_export_requests").insert({
    user_id: user.id,
    status: "completed",
    completed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "data_exported",
    resource_type: "export",
  });

  // Return JSON directly (for immediate download)
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="odyssey-outdoors-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
