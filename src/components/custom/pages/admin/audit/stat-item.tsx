import type { JSX } from "react";

import { cn } from "~/src/lib/utils";

interface StatItemProps {
  readonly dotColor?: string;
  readonly isActive?: boolean;
  readonly label: string;
  readonly onClick?: () => void;
  readonly value: number;
}

export function StatItem({ dotColor, isActive = false, label, onClick, value }: StatItemProps): JSX.Element {
  const isClickable = onClick !== undefined;

  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors",
        isClickable && "hover:bg-secondary/50",
        isActive && "bg-secondary"
      )}
      disabled={!isClickable}
      onClick={onClick}
      type="button"
    >
      {dotColor !== undefined && <span className={`size-1.5 rounded-full ${dotColor}`} />}
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}
