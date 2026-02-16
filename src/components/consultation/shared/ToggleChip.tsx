"use client";

interface ToggleChipProps {
  selected: boolean;
  onClick: () => void;
  label: string;
}

export function ToggleChip({ selected, onClick, label }: ToggleChipProps) {
  return (
    <button
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.97] ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}
