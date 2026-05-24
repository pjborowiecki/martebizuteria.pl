import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import type { AuditCategory } from "~/src/data/audit-data";

interface CategoryPillProps {
  readonly cat: AuditCategory;
  readonly category: AuditCategory;
  readonly onCategoryChange: (cat: AuditCategory) => void;
}

export function CategoryPill({ cat, category, onCategoryChange }: CategoryPillProps): JSX.Element {
  const t = useTranslations("admin");
  const handleClick = useCallback(() => {
    onCategoryChange(cat);
  }, [onCategoryChange, cat]);

  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        category === cat ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      {t(`audit.categories.${cat}`)}
    </button>
  );
}
