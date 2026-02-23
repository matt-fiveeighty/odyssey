"use client";

import { DollarSign } from "lucide-react";
import { AnnualBudgetPlanner } from "@/components/budget/AnnualBudgetPlanner";
import { YearByYearBreakdown } from "@/components/budget/YearByYearBreakdown";
import { SavingsGoalsSection } from "@/components/budget/SavingsGoalCard";
import { AnnualSpendForecast } from "@/components/budget/AnnualSpendForecast";
import { useAppStore } from "@/lib/store";
import { NoPlanGate } from "@/components/shared/NoPlanGate";

export default function BudgetPage() {
  const confirmedAssessment = useAppStore((s) => s.confirmedAssessment);
  const currentYear = new Date().getFullYear();

  if (!confirmedAssessment) {
    return (
      <div className="p-4 md:p-6 space-y-3 fade-in-up">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">Budget</h1>
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
    <div className="p-4 md:p-6 space-y-3 fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold tracking-tight">Budget — {currentYear}</h1>
      </div>

      {/* Annual Budget Overview + Point Subscription */}
      <AnnualBudgetPlanner />

      {/* Year-by-Year Itemized Breakdown */}
      <YearByYearBreakdown />

      {/* Dream Hunt Savings Goals */}
      <SavingsGoalsSection />

      {/* Annual Spend Forecast (SAV-07) */}
      <AnnualSpendForecast />
    </div>
  );
}
