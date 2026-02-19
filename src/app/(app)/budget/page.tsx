"use client";

import { DollarSign } from "lucide-react";
import { AnnualBudgetPlanner } from "@/components/budget/AnnualBudgetPlanner";
import { YearByYearBreakdown } from "@/components/budget/YearByYearBreakdown";
import { SavingsGoalsSection } from "@/components/budget/SavingsGoalCard";
import { useAppStore } from "@/lib/store";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

export default function BudgetPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const currentYear = new Date().getFullYear();

  if (!confirmedAssessment) {
    return (
      <div className="p-6 space-y-6 fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Hunt Budget
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your annual hunting expenses and save for dream hunts
          </p>
        </div>
        <NoPlanGate
          icon={DollarSign}
          title="No plan built yet"
          description="Complete a strategic assessment in the Plan Builder to generate a personalized budget with state-by-state cost breakdowns."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Hunt Budget — {currentYear}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your annual hunting expenses and save for dream hunts
          </p>
        </div>
      </div>

      {/* Annual Budget Overview + Point Subscription */}
      <AnnualBudgetPlanner />

      {/* Year-by-Year Itemized Breakdown */}
      <YearByYearBreakdown />

      {/* Dream Hunt Savings Goals */}
      <SavingsGoalsSection />
    </div>
  );
}
