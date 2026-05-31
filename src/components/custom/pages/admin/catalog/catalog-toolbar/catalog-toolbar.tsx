import type { JSX } from "react";

import { Filter, Search } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

export function CatalogToolbar(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
          strokeWidth={1.5}
        />
        <input
          type="text"
          aria-label={t("catalog.searchPlaceholder")}
          placeholder={t("catalog.searchPlaceholder")}
          className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
        />
      </div>
      <Button variant="outline" size="sm" className="h-9 gap-2 text-sm">
        <Filter className="size-3.5" strokeWidth={1.5} />
        {t("catalog.filter")}
      </Button>
    </div>
  );
}
