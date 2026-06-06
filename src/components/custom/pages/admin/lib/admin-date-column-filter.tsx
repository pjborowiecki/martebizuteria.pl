import { type JSX, useCallback, useEffect, useMemo, useState } from "react";

import type { RowData, Table } from "@tanstack/react-table";
import { ListFilter } from "lucide-react";
import { useFormatter } from "use-intl";

import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATORS,
  formatDateFilterTriggerLabel,
  formatDateToIsoDateLocal,
  isDateColumnFilterOperator,
  isDateColumnFilterValue,
  isDateFilterRangeValid,
  isIsoDateString,
  parseIsoDateToStartMs,
  type DateColumnFilterOperator,
  type DateColumnFilterValue
} from "~/src/lib/_utils/admin-date-filter";

import { Button } from "~/src/components/shadcn/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "~/src/components/shadcn/popover";

import { adminColumnFilterTriggerClass } from "~/src/components/custom/pages/admin/lib/admin-column-filter-trigger";
import {
  AdminDateFilterForm,
  type AdminDateFilterFormLabels,
  type DateFilterDraft
} from "~/src/components/custom/pages/admin/lib/admin-date-filter-form";

const TABLE_PAGE_INDEX_START = 0;
const DEFAULT_OPERATOR = DATE_COLUMN_FILTER_OPERATOR.ON;

export interface AdminDateColumnFilterLabels extends AdminDateFilterFormLabels {
  readonly apply: string;
  readonly clear: string;
  readonly operatorAfter: string;
  readonly operatorBefore: string;
  readonly operatorBetween: string;
  readonly operatorOn: string;
}

interface AdminDateColumnFilterProps<TData extends RowData> {
  readonly ariaLabel: string;
  readonly columnId: string;
  readonly label: string;
  readonly labels: AdminDateColumnFilterLabels;
  readonly table: Table<TData>;
}

function emptyDraft(): DateFilterDraft {
  return { date: "", endDate: "", operator: DEFAULT_OPERATOR, startDate: "" };
}

function toDraft(filter: DateColumnFilterValue | undefined): DateFilterDraft {
  if (filter === undefined) {
    return emptyDraft();
  }

  if (filter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return {
      date: "",
      endDate: filter.endDate ?? "",
      operator: filter.operator,
      startDate: filter.startDate ?? ""
    };
  }

  return {
    date: filter.date ?? "",
    endDate: "",
    operator: filter.operator,
    startDate: ""
  };
}

function isDraftValid(draft: DateFilterDraft): boolean {
  if (draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return isDateFilterRangeValid(draft.startDate, draft.endDate);
  }

  return isIsoDateString(draft.date);
}

function toFilterValue(draft: DateFilterDraft): DateColumnFilterValue {
  if (draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return { endDate: draft.endDate, operator: draft.operator, startDate: draft.startDate };
  }

  return { date: draft.date, operator: draft.operator };
}

const DATE_FILTER_OPERATOR_LABEL_KEY: Record<DateColumnFilterOperator, keyof AdminDateColumnFilterLabels> = {
  [DATE_COLUMN_FILTER_OPERATOR.AFTER]: "operatorAfter",
  [DATE_COLUMN_FILTER_OPERATOR.BEFORE]: "operatorBefore",
  [DATE_COLUMN_FILTER_OPERATOR.BETWEEN]: "operatorBetween",
  [DATE_COLUMN_FILTER_OPERATOR.ON]: "operatorOn"
};

/** Popover filter: date operator + one or two date fields for an admin date column. */
export function AdminDateColumnFilter<TData extends RowData>({
  ariaLabel,
  columnId,
  label,
  labels,
  table
}: Readonly<AdminDateColumnFilterProps<TData>>): JSX.Element {
  const format = useFormatter();
  const column = table.getColumn(columnId);
  const rawFilter = column?.getFilterValue();
  const activeFilter = isDateColumnFilterValue(rawFilter) ? rawFilter : undefined;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateFilterDraft>(() => toDraft(activeFilter));
  const todayIso = formatDateToIsoDateLocal(new Date());

  useEffect(() => {
    if (open) {
      setDraft(toDraft(activeFilter));
    }
  }, [activeFilter, open]);

  const operatorOptions = useMemo(
    () =>
      DATE_COLUMN_FILTER_OPERATORS.map((operator) => ({
        label: labels[DATE_FILTER_OPERATOR_LABEL_KEY[operator]],
        value: operator
      })),
    [labels]
  );

  const formatIsoDateLabel = useCallback(
    (isoDate: string): string => format.dateTime(new Date(parseIsoDateToStartMs(isoDate)), { dateStyle: "medium" }),
    [format]
  );

  const triggerLabel = formatDateFilterTriggerLabel({
    activeFilter,
    formatIsoDateLabel,
    idleLabel: label
  });

  const handleOperatorChange = useCallback((value: string | null) => {
    if (value === null || !isDateColumnFilterOperator(value)) {
      return;
    }

    setDraft((current) => ({ ...current, operator: value }));
  }, []);

  const handleDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({ ...current, date: isoDate }));
  }, []);

  const handleStartDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({ ...current, startDate: isoDate }));
  }, []);

  const handleEndDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({ ...current, endDate: isoDate }));
  }, []);

  const handleApply = useCallback(() => {
    if (!isDraftValid(draft)) {
      return;
    }

    column?.setFilterValue(toFilterValue(draft));
    table.setPageIndex(TABLE_PAGE_INDEX_START);
    setOpen(false);
  }, [column, draft, table]);

  const handleClear = useCallback(() => {
    column?.setFilterValue(undefined);
    table.setPageIndex(TABLE_PAGE_INDEX_START);
    setDraft(emptyDraft());
    setOpen(false);
  }, [column, table]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={ariaLabel} className={adminColumnFilterTriggerClass(activeFilter !== undefined)}>
        <ListFilter className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>

        <AdminDateFilterForm
          draft={draft}
          labels={labels}
          onDateChange={handleDateChange}
          onEndDateChange={handleEndDateChange}
          onOperatorChange={handleOperatorChange}
          onStartDateChange={handleStartDateChange}
          operatorOptions={operatorOptions}
          todayIso={todayIso}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          {activeFilter !== undefined && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              {labels.clear}
            </Button>
          )}
          <Button type="button" size="sm" disabled={!isDraftValid(draft)} onClick={handleApply}>
            {labels.apply}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
