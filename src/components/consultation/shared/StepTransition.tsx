"use client";

interface StepTransitionProps {
  direction: "forward" | "backward";
  children: React.ReactNode;
  stepKey: number;
}

export function StepTransition({ direction, children, stepKey }: StepTransitionProps) {
  return (
    <div
      key={stepKey}
      className={direction === "forward" ? "step-enter-forward" : "step-enter-backward"}
    >
      {children}
    </div>
  );
}
