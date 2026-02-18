"use client";

import { DollarSign } from "lucide-react";
import { AnnualBudgetPlanner } from "@/components/budget/AnnualBudgetPlanner";
import { SavingsGoalsSection } from "@/components/budget/SavingsGoalCard";

export default function BudgetPage() {
  const currentYear = new Date().getFullYear();

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

      {/* Dream Hunt Savings Goals */}
      <SavingsGoalsSection />
    </div>
  );
}
