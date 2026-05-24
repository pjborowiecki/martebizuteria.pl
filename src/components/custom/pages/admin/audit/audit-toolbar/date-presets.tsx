import type { JSX } from "react";

import { Calendar } from "lucide-react";
import { useTranslations } from "use-intl";

const DATE_PRESET_KEYS = ["all", "today", "7d", "30d"] as const;

export function DatePresets(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex items-center gap-0.5">
      {DATE_PRESET_KEYS.map((dr) => (
        <button
          className="rounded-md px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          key={dr}
          type="button"
        >
          {t(`audit.dateRange.${dr}`)}
        </button>
      ))}
      <button
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        type="button"
      >
        <Calendar className="size-3" strokeWidth={1.5} />
        {t("audit.dateRange.custom")}
      </button>
    </div>
  );
}
