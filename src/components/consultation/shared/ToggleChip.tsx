"use client";

interface ToggleChipProps {
  selected: boolean;
  onClick: () => void;
  label?: string;
  children?: React.ReactNode;
}

export function ToggleChip({ selected, onClick, label, children }: ToggleChipProps) {
  return (
    <button
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer active:scale-[0.97] ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {children ?? label}
    </button>
  );
}
