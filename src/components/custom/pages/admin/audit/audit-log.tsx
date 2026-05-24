import { type JSX, useCallback, useMemo, useState } from "react";

import { AuditFooter } from "~/src/components/custom/pages/admin/audit/audit-footer";
import { AuditStatStrip } from "~/src/components/custom/pages/admin/audit/audit-stat-strip";
import { AuditTable } from "~/src/components/custom/pages/admin/audit/audit-table/audit-table";
import { AuditToolbar } from "~/src/components/custom/pages/admin/audit/audit-toolbar/audit-toolbar";

import { type AuditCategory, AUDIT_EVENTS } from "~/src/data/audit-data";

export function AuditLog(): JSX.Element {
  const [category, setCategory] = useState<AuditCategory>("all");
  const [severity, setSeverity] = useState<string | undefined>();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      AUDIT_EVENTS.filter((event) => {
        if (category !== "all" && event.category !== category) {
          return false;
        }
        if (severity !== undefined && event.severity !== severity) {
          return false;
        }
        if (query !== "") {
          const q = query.toLowerCase();
          const searchable = `${event.action} ${event.target} ${event.detail ?? ""} ${event.actor.name} ${event.ip ?? ""}`.toLowerCase();
          if (!searchable.includes(q)) {
            return false;
          }
        }
        return true;
      }),
    [category, severity, query]
  );

  const hasFilters = severity !== undefined || category !== "all" || query !== "";

  const handleSeverityToggle = useCallback((sev: string): void => {
    setSeverity((prev) => (prev === sev ? undefined : sev));
  }, []);

  const handleClearAll = useCallback((): void => {
    setSeverity(undefined);
    setCategory("all");
    setQuery("");
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <AuditStatStrip onSeverityToggle={handleSeverityToggle} selectedSeverity={severity} />

      <AuditToolbar
        category={category}
        hasFilters={hasFilters}
        onCategoryChange={setCategory}
        onClearAll={handleClearAll}
        onQueryChange={setQuery}
        onSeverityToggle={handleSeverityToggle}
        query={query}
        severity={severity}
      />

      <AuditTable events={filtered} />

      <AuditFooter filteredCount={filtered.length} totalCount={AUDIT_EVENTS.length} />
    </div>
  );
}
