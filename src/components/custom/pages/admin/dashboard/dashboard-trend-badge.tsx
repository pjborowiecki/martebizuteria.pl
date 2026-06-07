import type { JSX } from "react";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "~/src/lib/utils";

const ZERO_TREND = 0;

interface DashboardTrendBadgeProps {
  readonly className?: string;
  readonly trendPercent: number;
}

export function DashboardTrendBadge({ className, trendPercent }: Readonly<DashboardTrendBadgeProps>): JSX.Element {
  const isUp = trendPercent >= ZERO_TREND;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
        className
      )}
    >
      {isUp ? <ArrowUpRight className="size-3" strokeWidth={2} /> : <ArrowDownRight className="size-3" strokeWidth={2} />}
      {`${isUp ? "+" : ""}${trendPercent}%`}
    </span>
  );
}
