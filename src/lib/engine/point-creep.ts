/**
 * Point Creep Model
 *
 * Models the annual inflation of point requirements for popular units.
 * Point creep is the reality that as more hunters apply, the points
 * needed to draw a specific tag increase over time.
 */

interface PointCreepInput {
  currentPointsRequired: number;
  yearsOfData?: number; // how many years of history we have
  annualCreepRate?: number; // override rate
}

interface PointCreepProjection {
  year: number;
  projectedPoints: number;
}

/**
 * Default creep rates by unit tier:
 * - Trophy units (8-10 rating): 0.5-1.0 pts/year
 * - Mid-tier units (5-7 rating): 0.3-0.5 pts/year
 * - General/OTC units: 0-0.1 pts/year
 */
export function estimateCreepRate(trophyRating: number): number {
  if (trophyRating >= 8) return 0.7;
  if (trophyRating >= 6) return 0.4;
  if (trophyRating >= 4) return 0.2;
  return 0.05;
}

export function projectPointCreep(
  input: PointCreepInput,
  yearsForward: number = 10
): PointCreepProjection[] {
  const creepRate = input.annualCreepRate ?? 0.4;
  const currentYear = new Date().getFullYear();
  const projections: PointCreepProjection[] = [];

  for (let i = 0; i <= yearsForward; i++) {
    projections.push({
      year: currentYear + i,
      projectedPoints: Math.round(
        input.currentPointsRequired + creepRate * i
      ),
    });
  }

  return projections;
}

/**
 * Calculate when a user will be able to draw, accounting for creep.
 * The user gains 1 point/year, but requirements also creep.
 * They draw when their accumulated points >= projected requirement.
 */
export function yearsToDrawWithCreep(
  currentUserPoints: number,
  currentRequired: number,
  creepRate: number
): number {
  let userPts = currentUserPoints;
  let required = currentRequired;

  for (let year = 0; year < 30; year++) {
    if (userPts >= required) return year;
    userPts += 1;
    required += creepRate;
  }

  return 30; // cap at 30 years
}
