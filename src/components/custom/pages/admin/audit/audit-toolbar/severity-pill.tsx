import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { type SeverityLevel, SEVERITY_DOT_COLORS } from "~/src/data/audit-data";

const SEVERITY_ACTIVE_STYLES: Record<SeverityLevel, string> = {
  error: "bg-red-500/10 text-red-500 font-medium",
  info: "bg-blue-500/10 text-blue-600 font-medium",
  success: "bg-emerald-500/10 text-emerald-600 font-medium",
  warning: "bg-amber-500/10 text-amber-600 font-medium"
};

interface SeverityPillProps {
  readonly onSeverityToggle: (sev: string) => void;
  readonly selectedSeverity: string | undefined;
  readonly severity: SeverityLevel;
}

export function SeverityPill({ onSeverityToggle, selectedSeverity, severity }: SeverityPillProps): JSX.Element {
  const t = useTranslations("admin");
  const handleClick = useCallback(() => {
    onSeverityToggle(severity);
  }, [onSeverityToggle, severity]);

  return (
    <button
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
        selectedSeverity === severity ? SEVERITY_ACTIVE_STYLES[severity] : "text-muted-foreground/60 hover:text-muted-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      <span className={`size-1.5 rounded-full ${SEVERITY_DOT_COLORS[severity]}`} />
      {t(`audit.severity.${severity}`)}
    </button>
  );
}
