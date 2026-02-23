"use client";

import type { SavingsStatus } from "@/lib/types";

interface SavingsProgressRingProps {
  percent: number;
  status: SavingsStatus;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const statusStroke: Record<SavingsStatus, string> = {
  green: "stroke-chart-2",
  amber: "stroke-chart-4",
  red: "stroke-destructive",
};

export function SavingsProgressRing({
  percent,
  status,
  size = 64,
  strokeWidth = 4,
  children,
}: SavingsProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="text-secondary"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={statusStroke[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
