import type { JSX } from "react";

import { CategoryPill } from "~/src/components/custom/pages/admin/audit/audit-toolbar/category-pill";

import { type AuditCategory, AUDIT_CATEGORIES } from "~/src/data/audit-data";

interface CategoryPillsProps {
  readonly category: AuditCategory;
  readonly onCategoryChange: (cat: AuditCategory) => void;
}

export function CategoryPills({ category, onCategoryChange }: CategoryPillsProps): JSX.Element {
  return (
    <div className="flex gap-1">
      {AUDIT_CATEGORIES.map((cat) => (
        <CategoryPill category={category} cat={cat} key={cat} onCategoryChange={onCategoryChange} />
      ))}
    </div>
  );
}
