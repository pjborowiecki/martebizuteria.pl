import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import type { AuditLogCategoryFilter } from "~/src/modules/audit-log/audit-log.constants";

interface CategoryPillProps {
  readonly category: AuditLogCategoryFilter;
  readonly isActive: boolean;
  readonly onSelect: (category: AuditLogCategoryFilter) => void;
}

export function CategoryPill({ category, isActive, onSelect }: CategoryPillProps): JSX.Element {
  const t = useTranslations("pages.admin");
  const handleClick = useCallback(() => {
    onSelect(category);
  }, [category, onSelect]);

  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      {t(`audit.categories.${category}`)}
    </button>
  );
}
