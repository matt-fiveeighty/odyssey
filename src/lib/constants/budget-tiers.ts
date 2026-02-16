import { BudgetTier } from "@/lib/types";

export const BUDGET_TIERS: BudgetTier[] = [
  {
    id: "tier1",
    label: "Under $1,000",
    sublabel: "Point-only",
    min: 0,
    max: 1000,
  },
  {
    id: "tier2",
    label: "$1,000 - $3,000",
    sublabel: "OTC + points",
    min: 1000,
    max: 3000,
  },
  {
    id: "tier3",
    label: "$3,000 - $5,000",
    sublabel: "Dedicated",
    min: 3000,
    max: 5000,
  },
  {
    id: "tier4",
    label: "$5,000 - $10,000",
    sublabel: "Serious",
    min: 5000,
    max: 10000,
  },
  {
    id: "tier5",
    label: "$10,000+",
    sublabel: "All-in",
    min: 10000,
    max: 100000,
  },
];
