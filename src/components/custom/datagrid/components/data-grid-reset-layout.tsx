import { type JSX, useCallback, useMemo } from "react";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";

interface DataGridResetLayoutProps {
  readonly disabled: boolean;
  readonly onReset: () => void;
}

/** Restores default column order, widths, and visibility for this table. */
export function DataGridResetLayout({ disabled, onReset }: DataGridResetLayoutProps): JSX.Element {
  const t = useTranslations("dataGrid");

  const handleClick = useCallback(() => {
    onReset();
  }, [onReset]);

  const button = useMemo(
    () => (
      <span className="inline-flex">
        <Button type="button" variant="outline" size="icon-lg" disabled={disabled} aria-label={t("view.reset")} onClick={handleClick}>
          <RotateCcw className="size-4" strokeWidth={1.5} />
        </Button>
      </span>
    ),
    [disabled, handleClick, t]
  );

  return <DataGridIconTooltip label={t("view.reset")} trigger={button} />;
}
