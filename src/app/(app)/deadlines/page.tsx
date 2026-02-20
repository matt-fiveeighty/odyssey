"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import { STATES, STATES_MAP } from "@/lib/constants/states";
import { useAppStore } from "@/lib/store";
import { formatSpeciesName } from "@/lib/utils";

export default function DeadlinesPage() {
  const { userGoals, userPoints, confirmedAssessment } = useAppStore();

  const now = new Date();

  // All upcoming deadlines from all states, sorted chronologically
  const allDeadlines = useMemo(() => {
    return STATES
      .flatMap((s) => {
        const deadlines: {
          stateId: string;
          stateName: string;
          species: string;
          openDate: string;
          closeDate: string;
          color: string;
          buyPointsUrl: string;
        }[] = [];
        Object.entries(s.applicationDeadlines).forEach(([species, dates]) => {
          if (dates?.close) {
            deadlines.push({
              stateId: s.id,
              stateName: s.name,
              species,
              openDate: dates.open,
              closeDate: dates.close,
              color: s.color,
              buyPointsUrl: s.buyPointsUrl,
            });
          }
        });
        return deadlines;
      })
      .filter((d) => new Date(d.closeDate) > now)
      .sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  }, [now]);

  // Group by month
  const deadlinesByMonth = useMemo(() => {
    const groups: Record<string, typeof allDeadlines> = {};
    for (const d of allDeadlines) {
      const date = new Date(d.closeDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [allDeadlines]);

  // Check if user is invested in a state (has points or goals there)
  const investedStates = useMemo(() => {
    const set = new Set<string>();
    userPoints.forEach((p) => set.add(p.stateId));
    userGoals.forEach((g) => set.add(g.stateId));
    confirmedAssessment?.stateRecommendations.forEach((r) => set.add(r.stateId));
    return set;
  }, [userPoints, userGoals, confirmedAssessment]);

  function daysUntil(dateStr: string) {
    const diff = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function urgencyClass(days: number) {
    if (days <= 3) return "text-red-400";
    if (days <= 7) return "text-orange-400";
    if (days <= 14) return "text-amber-400";
    return "text-muted-foreground";
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Deadlines
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application deadlines across all states. Your invested states are highlighted.
        </p>
      </div>

      {Object.entries(deadlinesByMonth).map(([monthKey, deadlines]) => {
        const [year, month] = monthKey.split("-");
        const monthName = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        });

        return (
          <div key={monthKey}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {monthName}
              </h2>
            </div>

            <div className="space-y-2">
              {deadlines.map((d, i) => {
                const days = daysUntil(d.closeDate);
                const isInvested = investedStates.has(d.stateId);
                const state = STATES_MAP[d.stateId];

                return (
                  <Card
                    key={`${d.stateId}-${d.species}-${i}`}
                    className={`transition-colors ${isInvested ? "border-primary/20 bg-primary/5" : ""}`}
                  >
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      <Badge
                        className="shrink-0 text-[10px] font-bold"
                        style={{ backgroundColor: d.color, color: "white" }}
                      >
                        {d.stateId}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatSpeciesName(d.species)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Opens {d.openDate} &middot; Closes {d.closeDate}
                        </p>
                      </div>
                      <div className={`text-xs font-medium shrink-0 ${urgencyClass(days)}`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {days}d
                      </div>
                      {state && (
                        <a
                          href={state.buyPointsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={`Apply at ${d.stateName} Fish & Game`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
