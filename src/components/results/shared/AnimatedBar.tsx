"use client";

interface AnimatedBarProps {
  value: number;
  maxValue: number;
  label: string;
  sublabel?: string;
  color?: string;
  delay?: number;
}

export function AnimatedBar({ value, maxValue, label, sublabel, color = "bg-primary/70", delay = 0 }: AnimatedBarProps) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full ${color} bar-fill`}
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{value}/{maxValue}</span>
      {sublabel && <span className="text-[9px] text-muted-foreground/60 w-32 truncate hidden md:block">{sublabel}</span>}
    </div>
  );
}
