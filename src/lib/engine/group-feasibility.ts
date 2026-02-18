import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";

// ============================================================================
// Group Feasibility Engine
// Checks state-specific group application rules and generates actionable
// feasibility assessments for group hunting applications.
// ============================================================================

export interface GroupMember {
  userId: string;
  name: string;
  points: number;
  isResident: boolean;
}

export interface FeasibilityResult {
  stateId: string;
  stateName: string;
  feasible: boolean;
  status: "green" | "yellow" | "red";
  maxGroupSize: number;
  allowsGroupApplication: boolean;
  pointPooling: boolean;
  warnings: string[];
  tips: string[];
}

// State-specific group application rules
const STATE_GROUP_RULES: Record<
  string,
  {
    maxGroupSize: number;
    allowsGroup: boolean;
    pointPooling: boolean;
    notes: string;
  }
> = {
  CO: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: false,
    notes:
      "Group members drawn together but points not pooled. All members must have preference points.",
  },
  WY: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes:
      "Points averaged across group. Lowest point holder determines draw position.",
  },
  MT: {
    maxGroupSize: 3,
    allowsGroup: true,
    pointPooling: false,
    notes: "Party applications available. Each member uses own points.",
  },
  NV: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes:
      "Bonus points squared for each member averaged. Large groups reduce odds significantly.",
  },
  AZ: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes: "Bonus points averaged. Group apps reduce individual odds.",
  },
  UT: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes: "Group bonus points averaged.",
  },
  NM: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: false,
    notes: "Pure random draw -- group has no point advantage.",
  },
  OR: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes: "Preference points averaged across party.",
  },
  ID: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: false,
    notes: "Random draw. Group application available.",
  },
  KS: {
    maxGroupSize: 2,
    allowsGroup: true,
    pointPooling: false,
    notes: "Limited group size. NR preference point system.",
  },
  AK: {
    maxGroupSize: 2,
    allowsGroup: false,
    pointPooling: false,
    notes:
      "No group applications for most hunts. Apply individually.",
  },
  WA: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: true,
    notes: "Preference points averaged for special permit hunts.",
  },
  NE: {
    maxGroupSize: 2,
    allowsGroup: true,
    pointPooling: false,
    notes:
      "Limited group size. True preference point system.",
  },
  SD: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: false,
    notes:
      "True preference point system. Group draws based on lowest point holder.",
  },
  ND: {
    maxGroupSize: 4,
    allowsGroup: true,
    pointPooling: false,
    notes: "Bonus point system. Group applications available for most species.",
  },
};

/**
 * Check whether a group can feasibly apply together in a given state
 * for a given species. Returns a detailed feasibility result with
 * green/yellow/red status, warnings, and optimization tips.
 */
export function checkGroupFeasibility(
  stateId: string,
  members: GroupMember[],
  speciesId: string
): FeasibilityResult {
  const state = STATES_MAP[stateId];
  const stateName = state?.name ?? stateId;
  const species = SPECIES_MAP[speciesId];
  const speciesName = species?.name ?? speciesId;
  const rules = STATE_GROUP_RULES[stateId];

  // No rules found for this state
  if (!rules) {
    return {
      stateId,
      stateName,
      feasible: false,
      status: "red",
      maxGroupSize: 0,
      allowsGroupApplication: false,
      pointPooling: false,
      warnings: [
        `No group application rules found for ${stateName}. Check state regulations directly.`,
      ],
      tips: [],
    };
  }

  const warnings: string[] = [];
  const tips: string[] = [];
  let status: "green" | "yellow" | "red" = "green";

  // Check if state allows group applications at all
  if (!rules.allowsGroup) {
    return {
      stateId,
      stateName,
      feasible: false,
      status: "red",
      maxGroupSize: rules.maxGroupSize,
      allowsGroupApplication: false,
      pointPooling: false,
      warnings: [
        `${stateName} does not allow group applications for most hunts. Each member must apply individually.`,
      ],
      tips: [
        "Consider coordinating individual applications for the same unit to hunt together if drawn.",
      ],
    };
  }

  // Check if species is available in state
  if (state && !state.availableSpecies.includes(speciesId)) {
    return {
      stateId,
      stateName,
      feasible: false,
      status: "red",
      maxGroupSize: rules.maxGroupSize,
      allowsGroupApplication: rules.allowsGroup,
      pointPooling: rules.pointPooling,
      warnings: [
        `${speciesName} is not available in ${stateName}.`,
      ],
      tips: [],
    };
  }

  // Check group size
  if (members.length > rules.maxGroupSize) {
    warnings.push(
      `Group has ${members.length} members but ${stateName} allows a maximum of ${rules.maxGroupSize}. Remove ${members.length - rules.maxGroupSize} member(s).`
    );
    status = "red";
  }

  // Need at least 2 members for a group application
  if (members.length < 2) {
    warnings.push(
      "A group application requires at least 2 members."
    );
    status = "red";
  }

  // Point analysis
  const memberPoints = members.map((m) => m.points);
  const minPoints = Math.min(...memberPoints);
  const maxPoints = Math.max(...memberPoints);
  const avgPoints =
    memberPoints.reduce((sum, p) => sum + p, 0) / memberPoints.length;
  const pointSpread = maxPoints - minPoints;

  // Point pooling analysis
  if (rules.pointPooling) {
    if (pointSpread > 3) {
      warnings.push(
        `Large point disparity (${minPoints}-${maxPoints} pts). When points are averaged, the group draws at ${avgPoints.toFixed(1)} avg points -- the high-point members lose significant advantage.`
      );
      if (status === "green") status = "yellow";
    } else if (pointSpread > 1) {
      warnings.push(
        `Point spread of ${pointSpread} across members. Average draw position: ${avgPoints.toFixed(1)} points.`
      );
      if (status === "green") status = "yellow";
    }

    tips.push(
      `${stateName} averages points across the group. Ideal groups have similar point totals.`
    );

    // State-specific pooling warnings
    if (stateId === "NV") {
      tips.push(
        "Nevada squares bonus points before averaging. Large groups reduce individual odds significantly -- consider smaller parties for better odds."
      );
    }
    if (stateId === "WY") {
      tips.push(
        "Wyoming uses the lowest point holder to determine draw position. Your group is only as strong as its weakest member."
      );
    }
  } else {
    // No pooling
    if (stateId === "NM") {
      tips.push(
        "New Mexico is a pure random draw. Group application has no point advantage -- everyone has equal odds."
      );
    } else if (stateId === "CO") {
      tips.push(
        "Colorado does not pool points. Each member draws on their own points, but all must be drawn together. A low-point member could prevent the entire group from drawing."
      );
      if (pointSpread > 2) {
        warnings.push(
          `Point disparity may prevent draw. Colorado draws the group on the lowest member's points (${minPoints} pts). Consider waiting until all members have similar points.`
        );
        if (status === "green") status = "yellow";
      }
    } else {
      tips.push(
        `${stateName} does not pool points. Each member uses their own points in the group draw.`
      );
    }
  }

  // Residency mix warnings
  const residents = members.filter((m) => m.isResident);
  const nonResidents = members.filter((m) => !m.isResident);
  if (residents.length > 0 && nonResidents.length > 0) {
    warnings.push(
      `Mixed resident/non-resident group (${residents.length}R / ${nonResidents.length}NR). Most states require all group members to be in the same residency pool. Check ${stateName} regulations.`
    );
    if (status === "green") status = "yellow";
  }

  // Group size optimization tips
  if (members.length === rules.maxGroupSize) {
    tips.push(
      `Your group is at maximum size for ${stateName} (${rules.maxGroupSize} members).`
    );
  } else if (members.length < rules.maxGroupSize && status !== "red") {
    tips.push(
      `You can add up to ${rules.maxGroupSize - members.length} more member(s) (max ${rules.maxGroupSize} in ${stateName}).`
    );
  }

  // Add the state-specific notes as a tip
  tips.push(rules.notes);

  // Determine feasibility
  const feasible = status !== "red";

  return {
    stateId,
    stateName,
    feasible,
    status,
    maxGroupSize: rules.maxGroupSize,
    allowsGroupApplication: rules.allowsGroup,
    pointPooling: rules.pointPooling,
    warnings,
    tips,
  };
}

/**
 * Check feasibility across all states for a given group and species.
 * Useful for finding the best state for a group application.
 */
export function checkAllStatesFeasibility(
  members: GroupMember[],
  speciesId: string
): FeasibilityResult[] {
  return Object.keys(STATE_GROUP_RULES)
    .map((stateId) => checkGroupFeasibility(stateId, members, speciesId))
    .sort((a, b) => {
      // Sort: green first, then yellow, then red
      const statusOrder = { green: 0, yellow: 1, red: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
}

/**
 * Get the group rules for a specific state.
 * Returns undefined if the state has no known group rules.
 */
export function getStateGroupRules(stateId: string) {
  return STATE_GROUP_RULES[stateId] ?? null;
}
