"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GLOSSARY: Record<string, string> = {
  "preference points":
    "Points that guarantee you a tag before lower-point applicants. The more you have, the sooner you draw.",
  "bonus points":
    "Points that increase your odds in a random draw but don't guarantee anything. More points = more entries in the hat.",
  "bonus squared":
    "Your bonus points are squared when calculating odds. 5 points = 25 entries. Makes patience pay off exponentially.",
  draw: "The lottery system states use to allocate limited hunting tags. You apply and hope to be selected.",
  "draw odds":
    "Your statistical chance of being selected for a tag in a given unit/hunt. Varies by points and applicant pool.",
  "point creep":
    "When the minimum points needed to draw a tag increases each year as more hunters accumulate points.",
  tag: "Your hunting permit for a specific species, unit, and season. Required to legally hunt.",
  unit: "A designated geographic area where you can hunt. Each state divides hunting land into numbered units.",
  "unit code":
    "The official number/name a state assigns to a hunting unit. Used when applying for draws.",
  otc: "Over-the-counter. Tags available for purchase without entering a draw — first come, first served.",
  "non-resident":
    "A hunter applying in a state where they don't live. Non-residents typically pay higher fees and have fewer tags available.",
  "qualifying license":
    "A base hunting license required before you can apply for draws or buy points in some states.",
  "trophy rating":
    "A score (1-10) indicating the quality of animals in a unit. Higher = bigger, more mature animals.",
  "success rate":
    "The percentage of tag holders who actually harvest an animal in a given unit.",
  "public land":
    "Federal or state-owned land open to hunting. BLM, National Forest, and state trust lands.",
  "tag quota":
    "The total number of tags a state issues for a specific unit and season.",
  "hunt style":
    "How you hunt: DIY backpack (self-supported wilderness), DIY truck (vehicle-accessible camps), guided (with an outfitter), or drop camp (outfitter drops you at a remote camp).",
  "diy backpack":
    "Self-supported hunting where you carry everything on your back into the wilderness. Most physically demanding.",
  "diy truck":
    "Self-guided hunting from a vehicle-accessible camp. Drive to trailheads, hunt on foot, return to camp.",
  guided: "Hunting with a professional outfitter who provides lodging, meals, transportation, and expertise.",
  "drop camp":
    "An outfitter packs you and your gear into a remote camp by horse or ATV, then leaves you to hunt independently.",
  "point year":
    "A year where you're building points but not hunting. Lower cost — just application/license fees.",
  "hunt year":
    "A year where you draw a tag and actually go on a hunt. Higher cost — tag fees, travel, lodging, etc.",
  portfolio:
    "Your collection of points, applications, and goals across multiple states — managed like a financial investment.",
  "annual subscription":
    "The yearly cost to maintain your points across all states — license fees, application fees, and point purchases.",
  "once-in-a-lifetime":
    "Species you can only draw a tag for once ever (e.g., moose, sheep, goat in some states). Choose wisely.",
};

interface HuntingTermProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
  iconSize?: number;
}

export function HuntingTerm({ term, children, className, iconSize = 3 }: HuntingTermProps) {
  const definition = GLOSSARY[term.toLowerCase()];
  if (!definition) return <>{children ?? term}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/40 ${className ?? ""}`}
          >
            {children ?? term}
            <HelpCircle className={`w-${iconSize} h-${iconSize} text-muted-foreground/60 shrink-0`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { GLOSSARY };
