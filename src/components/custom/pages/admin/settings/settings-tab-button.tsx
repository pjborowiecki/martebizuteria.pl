import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import type { SettingsTab, SettingsTabDefinition } from "~/src/data/settings-data";

interface SettingsTabButtonProps {
  readonly isActive: boolean;
  readonly onSelect: (key: SettingsTab) => void;
  readonly tab: SettingsTabDefinition;
}

export function SettingsTabButton({ isActive, onSelect, tab }: SettingsTabButtonProps): JSX.Element {
  const t = useTranslations("pages.admin");
  const handleClick = useCallback(() => {
    onSelect(tab.key);
  }, [onSelect, tab.key]);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
      onClick={handleClick}
      type="button"
    >
      <tab.icon className="size-[18px]" strokeWidth={1.5} />
      {t(`settings.tabs.${tab.key}`)}
    </button>
  );
}
