import type { JSX } from "react";

import { SeverityPill } from "~/src/components/custom/pages/admin/audit/audit-toolbar/severity-pill";

import { SEVERITY_LEVELS } from "~/src/data/audit-data";

interface SeverityPillsProps {
  readonly onSeverityToggle: (sev: string) => void;
  readonly severity: string | undefined;
}

export function SeverityPills({ onSeverityToggle, severity }: SeverityPillsProps): JSX.Element {
  return (
    <div className="flex items-center gap-0.5">
      {SEVERITY_LEVELS.map((sev) => (
        <SeverityPill key={sev} onSeverityToggle={onSeverityToggle} selectedSeverity={severity} severity={sev} />
      ))}
    </div>
  );
}
