"use client";

import { useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearPillsProps {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
  currentYear: number;
}

export function YearPills({ years, selectedYear, onSelect, currentYear }: YearPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll selected pill into view on mount / year change
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selectedEl = container.querySelector("[data-selected=true]") as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [selectedYear]);

  const scroll = useCallback((dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = dir === "left" ? -120 : 120;
    container.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  return (
    <div className="flex items-center gap-1">
      {/* Left arrow — scroll back */}
      <button
        onClick={() => scroll("left")}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
        aria-label="Scroll years left"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Scrollable pill container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory max-w-[320px]"
      >
        {years.map((year) => {
          const isSelected = year === selectedYear;
          const isCurrent = year === currentYear;

          return (
            <button
              key={year}
              data-selected={isSelected}
              onClick={() => onSelect(year)}
              className={cn(
                "relative px-3 py-1.5 rounded-lg text-xs font-medium tabular-nums transition-all duration-150 cursor-pointer border shrink-0 snap-center",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/40 text-muted-foreground border-border/50 hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {year}
              {/* Current year dot indicator (subtle, only when NOT selected) */}
              {isCurrent && !isSelected && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right arrow — scroll forward */}
      <button
        onClick={() => scroll("right")}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
        aria-label="Scroll years right"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
