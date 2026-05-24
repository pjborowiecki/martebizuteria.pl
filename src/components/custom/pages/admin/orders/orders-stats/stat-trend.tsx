import type { JSX } from "react";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatTrendProps {
  readonly trend: string;
  readonly up: boolean;
}

export function StatTrend({ trend, up }: StatTrendProps): JSX.Element {
  if (up) {
    return (
      <span className="flex items-center gap-0.5 text-[12px] text-emerald-600">
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
        {trend}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 text-[12px] text-red-500">
      <ArrowDownRight className="size-3.5" strokeWidth={2} />
      {trend}
    </span>
  );
}
