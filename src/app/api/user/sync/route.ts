import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================================
// GET /api/user/sync — Fetch ALL user data in a single request for hydration.
// Returns: plans, goals, savings, alerts, points, wizardState, activePlanId
// ============================================================================

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallel fetch all user data
    const [plansRes, goalsRes, savingsRes, alertsRes, pointsRes, wizardRes] =
      await Promise.all([
        supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("savings_goals")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("fiduciary_alerts")
          .select("*")
          .eq("user_id", user.id)
          .eq("dismissed", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_points")
          .select("*")
          .eq("user_id", user.id)
          .order("state_id"),
        supabase
          .from("wizard_state")
          .select("*")
          .eq("user_id", user.id)
          .single(),
      ]);

    // Map DB rows → client types (snake_case → camelCase)
    const plans = (plansRes.data ?? []).map(mapPlanFromDb);
    const goals = (goalsRes.data ?? []).map(mapGoalFromDb);
    const savings = (savingsRes.data ?? []).map(mapSavingsFromDb);
    const alerts = (alertsRes.data ?? []).map(mapAlertFromDb);
    const points = (pointsRes.data ?? []).map(mapPointFromDb);
    const wizardState = wizardRes.data?.state ?? null;

    // Derive activePlanId from is_active flag
    const activePlan = (plansRes.data ?? []).find(
      (p: Record<string, unknown>) => p.is_active
    );
    const activePlanId = activePlan ? (activePlan.id as string) : plans[0]?.id ?? null;

    return NextResponse.json({
      plans,
      goals,
      savings,
      alerts,
      points,
      wizardState,
      activePlanId,
    });
  } catch (err) {
    console.error("[sync/GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/user/sync — Upsert ALL user data in a single request.
// Accepts: { plans, goals, savings, alerts, points, activePlanId, wizardState }
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const counts: Record<string, number> = {};

    // ── Plans (assessments table) ──────────────────────────────────────────
    if (Array.isArray(body.plans) && body.plans.length > 0) {
      const planRows = body.plans.map(
        (p: Record<string, unknown>) => mapPlanToDb(p, user.id, p.id === body.activePlanId)
      );
      const { error } = await supabase
        .from("assessments")
        .upsert(planRows, { onConflict: "id" });
      if (error) console.error("[sync/plans]", error.message);
      counts.plans = planRows.length;
    }

    // ── Goals (user_goals table) ───────────────────────────────────────────
    if (Array.isArray(body.goals) && body.goals.length > 0) {
      const goalRows = body.goals.map(
        (g: Record<string, unknown>) => mapGoalToDb(g, user.id)
      );
      const { error } = await supabase
        .from("user_goals")
        .upsert(goalRows, { onConflict: "id" });
      if (error) console.error("[sync/goals]", error.message);
      counts.goals = goalRows.length;
    }

    // ── Savings (savings_goals table) ──────────────────────────────────────
    if (Array.isArray(body.savings) && body.savings.length > 0) {
      const savingsRows = body.savings.map(
        (s: Record<string, unknown>) => mapSavingsToDb(s, user.id)
      );
      const { error } = await supabase
        .from("savings_goals")
        .upsert(savingsRows, { onConflict: "id" });
      if (error) console.error("[sync/savings]", error.message);
      counts.savings = savingsRows.length;
    }

    // ── Alerts (fiduciary_alerts table) ────────────────────────────────────
    if (Array.isArray(body.alerts) && body.alerts.length > 0) {
      const alertRows = body.alerts.map(
        (a: Record<string, unknown>) => mapAlertToDb(a, user.id)
      );
      const { error } = await supabase
        .from("fiduciary_alerts")
        .upsert(alertRows, { onConflict: "user_id,alert_id" });
      if (error) console.error("[sync/alerts]", error.message);
      counts.alerts = alertRows.length;
    }

    // ── Points (user_points table) ─────────────────────────────────────────
    if (Array.isArray(body.points) && body.points.length > 0) {
      const pointRows = body.points.map(
        (p: Record<string, unknown>) => mapPointToDb(p, user.id)
      );
      const { error } = await supabase
        .from("user_points")
        .upsert(pointRows, {
          onConflict: "user_id,state_id,species_id,point_type",
        });
      if (error) console.error("[sync/points]", error.message);
      counts.points = pointRows.length;
    }

    // ── Wizard State (wizard_state table) ──────────────────────────────────
    if (body.wizardState && typeof body.wizardState === "object") {
      const { error } = await supabase.from("wizard_state").upsert(
        {
          user_id: user.id,
          state: body.wizardState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) console.error("[sync/wizard]", error.message);
      counts.wizard = 1;
    }

    return NextResponse.json({ synced: true, counts });
  } catch (err) {
    console.error("[sync/POST]", err);
    return NextResponse.json(
      { error: "Failed to sync user data" },
      { status: 500 }
    );
  }
}

// ============================================================================
// DB ↔ Client Type Mappers (snake_case ↔ camelCase)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanFromDb(row: any) {
  return {
    id: row.id,
    name: row.name ?? "My Strategy",
    label: row.label ?? undefined,
    assessment: {
      ...row.result,
      // Ensure the assessment ID matches the plan ID
      id: row.id,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanToDb(plan: any, userId: string, isActive: boolean) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name ?? "My Strategy",
    label: plan.label ?? null,
    input: plan.assessment?.macroSummary ?? {},
    result: plan.assessment ?? {},
    is_active: isActive,
    updated_at: plan.updatedAt ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoalFromDb(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id ?? undefined,
    title: row.title,
    speciesId: row.species_id ?? "",
    stateId: row.state_id ?? "",
    unitId: row.unit_id ?? undefined,
    targetYear: row.target_year ?? new Date().getFullYear() + 1,
    projectedDrawYear: row.projected_draw_year ?? undefined,
    status: row.status ?? "active",
    notes: row.notes ?? undefined,
    milestones: row.milestones ?? [],
    weaponType: row.weapon_type ?? undefined,
    seasonPreference: row.season_preference ?? undefined,
    huntStyle: row.hunt_style ?? undefined,
    trophyDescription: row.trophy_description ?? undefined,
    dreamTier: row.dream_tier ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoalToDb(goal: any, userId: string) {
  return {
    id: goal.id,
    user_id: userId,
    plan_id: goal.planId ?? null,
    title: goal.title,
    state_id: goal.stateId ?? null,
    species_id: goal.speciesId ?? null,
    unit_id: goal.unitId ?? null,
    target_year: goal.targetYear ?? null,
    projected_draw_year: goal.projectedDrawYear ?? null,
    priority: goal.dreamTier === "once_in_a_lifetime" ? "high" : "medium",
    status: goal.status ?? "active",
    notes: goal.notes ?? null,
    milestones: goal.milestones ?? [],
    weapon_type: goal.weaponType ?? null,
    season_preference: goal.seasonPreference ?? null,
    hunt_style: goal.huntStyle ?? null,
    trophy_description: goal.trophyDescription ?? null,
    dream_tier: goal.dreamTier ?? null,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSavingsFromDb(row: any) {
  return {
    id: row.id,
    goalId: row.goal_id ?? row.id,
    currentSaved: row.current_saved ?? 0,
    monthlySavings: row.monthly_savings ?? 0,
    contributions: row.contributions ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSavingsToDb(savings: any, userId: string) {
  return {
    id: savings.id,
    user_id: userId,
    title: `Savings for ${savings.goalId}`,
    target_cost: 0,
    goal_id: savings.goalId ?? null,
    current_saved: savings.currentSaved ?? 0,
    monthly_savings: savings.monthlySavings ?? 0,
    contributions: savings.contributions ?? [],
    updated_at: savings.updatedAt ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlertFromDb(row: any) {
  return {
    id: row.alert_id,
    severity: row.severity,
    title: row.title,
    description: row.description,
    recommendation: row.recommendation ?? undefined,
    stateId: row.state_id ?? undefined,
    speciesId: row.species_id ?? undefined,
    eventType: row.event_type,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlertToDb(alert: any, userId: string) {
  return {
    user_id: userId,
    alert_id: alert.id,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    recommendation: alert.recommendation ?? null,
    state_id: alert.stateId ?? null,
    species_id: alert.speciesId ?? null,
    event_type: alert.eventType,
    schedule_conflicts: [],
    dismissed: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPointFromDb(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    stateId: row.state_id,
    speciesId: row.species_id,
    points: row.points,
    pointType: row.point_type,
    yearStarted: row.year_started,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPointToDb(point: any, userId: string) {
  return {
    user_id: userId,
    state_id: point.stateId,
    species_id: point.speciesId,
    points: point.points,
    point_type: point.pointType ?? "preference",
    year_started: point.yearStarted ?? null,
    updated_at: new Date().toISOString(),
  };
}
