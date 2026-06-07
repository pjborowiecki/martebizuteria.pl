import { Activity, AlertTriangle, CalendarDays, type LucideIcon, XCircle } from "lucide-react";

import type { AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants";

export type AuditStatKey = "errors" | "today" | "total" | "warnings";

export interface AuditStatCardConfig {
  readonly filterSeverity?: AuditLogSeverity;
  readonly gradient: string;
  readonly icon: LucideIcon;
  readonly key: AuditStatKey;
}

export const AUDIT_STAT_CARDS: readonly AuditStatCardConfig[] = [
  {
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Activity,
    key: "total"
  },
  {
    gradient: "from-blue-500/20 via-sky-500/6 to-transparent",
    icon: CalendarDays,
    key: "today"
  },
  {
    filterSeverity: "warning",
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: AlertTriangle,
    key: "warnings"
  },
  {
    filterSeverity: "error",
    gradient: "from-red-500/20 via-rose-500/6 to-transparent",
    icon: XCircle,
    key: "errors"
  }
];
