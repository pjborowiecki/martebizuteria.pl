import type { JSX } from "react";

import { X } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { CategoryPills } from "~/src/components/custom/pages/admin/audit/audit-toolbar/category-pills";
import { DatePresets } from "~/src/components/custom/pages/admin/audit/audit-toolbar/date-presets";
import { SearchInput } from "~/src/components/custom/pages/admin/audit/audit-toolbar/search-input";
import { SeverityPills } from "~/src/components/custom/pages/admin/audit/audit-toolbar/severity-pills";

import type { AuditCategory } from "~/src/data/audit-data";

interface AuditToolbarProps {
  readonly category: AuditCategory;
  readonly hasFilters: boolean;
  readonly onCategoryChange: (category: AuditCategory) => void;
  readonly onClearAll: () => void;
  readonly onQueryChange: (query: string) => void;
  readonly onSeverityToggle: (severity: string) => void;
  readonly query: string;
  readonly severity: string | undefined;
}

export function AuditToolbar({
  category,
  hasFilters,
  onCategoryChange,
  onClearAll,
  onQueryChange,
  onSeverityToggle,
  query,
  severity
}: AuditToolbarProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="shrink-0 border-b border-border/40 bg-background">
      <div className="flex items-center gap-2 px-6 py-2">
        <CategoryPills category={category} onCategoryChange={onCategoryChange} />

        <div className="mx-1 h-4 w-px bg-border/40" />

        <SeverityPills onSeverityToggle={onSeverityToggle} severity={severity} />

        <div className="mx-1 h-4 w-px bg-border/40" />

        <DatePresets />

        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <Button className="h-7 gap-1 px-2 text-xs text-muted-foreground" onClick={onClearAll} size="sm" variant="ghost">
              <X className="size-3" strokeWidth={2} />
              {t("audit.clearFilter")}
            </Button>
          )}
          <SearchInput onChange={onQueryChange} value={query} />
        </div>
      </div>
    </div>
  );
}
