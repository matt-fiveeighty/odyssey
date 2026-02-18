"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { DrawHistoryEntry } from "@/lib/types";

interface DrawTrendChartProps {
  drawHistory: DrawHistoryEntry[];
}

interface ChartDataPoint {
  year: number;
  oddsPercent: number | null;
  applicants: number | null;
  minPointsDrawn: number | null;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number | null }[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry) => {
        if (entry.value == null) return null;
        let display = "";
        if (entry.name === "Draw Odds") {
          display = `${entry.value.toFixed(1)}%`;
        } else if (entry.name === "Applicants") {
          display = entry.value.toLocaleString();
        } else if (entry.name === "Min Points") {
          display = `${entry.value} pts`;
        }
        return (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DrawTrendChart({ drawHistory }: DrawTrendChartProps) {
  // Filter to entries that have at least one meaningful data point
  const data: ChartDataPoint[] = drawHistory
    .filter(
      (d) =>
        d.oddsPercent != null ||
        d.applicants != null ||
        d.minPointsDrawn != null
    )
    .sort((a, b) => a.year - b.year)
    .map((d) => ({
      year: d.year,
      oddsPercent: d.oddsPercent,
      applicants: d.applicants,
      minPointsDrawn: d.minPointsDrawn,
    }));

  const hasInsufficientData = data.length < 2;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Draw Trend (5-Year)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasInsufficientData ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-lg bg-secondary/30 border border-dashed border-border">
            <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Insufficient Draw Data
            </p>
            <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
              At least 2 years of draw history are needed to display trend
              charts. Data will appear here once available.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                {/* Left Y axis: Draw Odds % */}
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                  domain={[0, "auto"]}
                />
                {/* Right Y axis: Applicants count */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
                {/* Primary: Draw Odds */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="oddsPercent"
                  name="Draw Odds"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                {/* Secondary: Applicants */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="applicants"
                  name="Applicants"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{ r: 2, fill: "hsl(var(--muted-foreground))" }}
                  connectNulls
                />
                {/* Annotation: Min Points Drawn */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="minPointsDrawn"
                  name="Min Points"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={0}
                  dot={{
                    r: 4,
                    fill: "hsl(var(--chart-2))",
                    stroke: "hsl(var(--card))",
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
