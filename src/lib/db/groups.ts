import { createServerSupabase } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface GroupApplication {
  id: string;
  creatorId: string;
  stateId: string;
  speciesId: string;
  unitId: string | null;
  year: number;
  status: "forming" | "submitted" | "drawn" | "unsuccessful";
  notes: string | null;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  inviteEmail: string | null;
  role: "leader" | "member";
  points: number;
  status: "invited" | "accepted" | "declined";
  createdAt: string;
}

export interface CreateGroupInput {
  creatorId: string;
  stateId: string;
  speciesId: string;
  unitId?: string;
  year: number;
  notes?: string;
}

// ============================================================================
// Row Types
// ============================================================================

interface GroupApplicationRow {
  id: string;
  creator_id: string;
  state_id: string;
  species_id: string;
  unit_id: string | null;
  year: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string | null;
  invite_email: string | null;
  role: string;
  points: number;
  status: string;
  created_at: string;
}

// ============================================================================
// Row Mapping
// ============================================================================

function mapGroupRow(row: GroupApplicationRow): GroupApplication {
  return {
    id: row.id,
    creatorId: row.creator_id,
    stateId: row.state_id,
    speciesId: row.species_id,
    unitId: row.unit_id,
    year: row.year,
    status: row.status as GroupApplication["status"],
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapMemberRow(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    inviteEmail: row.invite_email,
    role: row.role as GroupMember["role"],
    points: row.points ?? 0,
    status: row.status as GroupMember["status"],
    createdAt: row.created_at,
  };
}

// ============================================================================
// Group Application CRUD
// ============================================================================

/**
 * Fetch all group applications where the user is the creator
 * or is a member.
 */
export async function getGroupApplications(
  userId: string
): Promise<GroupApplication[]> {
  try {
    const supabase = await createServerSupabase();

    // Fetch groups the user created
    const { data: createdGroups, error: createdError } = await supabase
      .from("group_applications")
      .select("*")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false });

    if (createdError) {
      console.error(
        "[db/groups] getGroupApplications (created) error:",
        createdError.message
      );
      return [];
    }

    // Fetch groups the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from("group_application_members")
      .select("group_id")
      .eq("user_id", userId);

    if (memberError) {
      console.error(
        "[db/groups] getGroupApplications (member) error:",
        memberError.message
      );
      // Still return created groups even if member lookup fails
      return (createdGroups as unknown as GroupApplicationRow[]).map(
        mapGroupRow
      );
    }

    const memberGroupIds = (memberships ?? []).map(
      (m: { group_id: string }) => m.group_id
    );

    // Fetch the actual group rows for memberships (exclude already-fetched created ones)
    let memberGroups: GroupApplicationRow[] = [];
    if (memberGroupIds.length > 0) {
      const createdIds = new Set(
        (createdGroups ?? []).map((g: { id: string }) => g.id)
      );
      const additionalIds = memberGroupIds.filter(
        (id: string) => !createdIds.has(id)
      );

      if (additionalIds.length > 0) {
        const { data: extraGroups, error: extraError } = await supabase
          .from("group_applications")
          .select("*")
          .in("id", additionalIds)
          .order("created_at", { ascending: false });

        if (!extraError && extraGroups) {
          memberGroups = extraGroups as unknown as GroupApplicationRow[];
        }
      }
    }

    const allGroups = [
      ...(createdGroups as unknown as GroupApplicationRow[]),
      ...memberGroups,
    ];

    return allGroups.map(mapGroupRow);
  } catch (err) {
    console.error("[db/groups] getGroupApplications unexpected error:", err);
    return [];
  }
}

/**
 * Create a new group application. The creator is automatically added
 * as the group leader.
 */
export async function createGroupApplication(
  input: CreateGroupInput
): Promise<GroupApplication> {
  const supabase = await createServerSupabase();

  // Create the group
  const { data: group, error: groupError } = await supabase
    .from("group_applications")
    .insert({
      creator_id: input.creatorId,
      state_id: input.stateId,
      species_id: input.speciesId,
      unit_id: input.unitId ?? null,
      year: input.year,
      status: "forming",
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (groupError) {
    throw new Error(
      `[db/groups] createGroupApplication failed: ${groupError.message}`
    );
  }

  // Add creator as leader
  const { error: memberError } = await supabase
    .from("group_application_members")
    .insert({
      group_id: group.id,
      user_id: input.creatorId,
      role: "leader",
      status: "accepted",
      points: 0,
    });

  if (memberError) {
    console.error(
      "[db/groups] Failed to add creator as leader:",
      memberError.message
    );
    // Don't throw — the group was created, membership is secondary
  }

  return mapGroupRow(group as unknown as GroupApplicationRow);
}

// ============================================================================
// Group Members
// ============================================================================

/**
 * Fetch all members of a group application.
 */
export async function getGroupMembers(
  groupId: string
): Promise<GroupMember[]> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("group_application_members")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at");

    if (error) {
      console.error("[db/groups] getGroupMembers error:", error.message);
      return [];
    }

    return (data as unknown as GroupMemberRow[]).map(mapMemberRow);
  } catch (err) {
    console.error("[db/groups] getGroupMembers unexpected error:", err);
    return [];
  }
}

/**
 * Invite a new member to a group application by email.
 * The member starts with status "invited".
 */
export async function inviteGroupMember(
  groupId: string,
  email: string
): Promise<GroupMember> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("group_application_members")
    .insert({
      group_id: groupId,
      invite_email: email,
      role: "member",
      status: "invited",
      points: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `[db/groups] inviteGroupMember failed: ${error.message}`
    );
  }

  return mapMemberRow(data as unknown as GroupMemberRow);
}
