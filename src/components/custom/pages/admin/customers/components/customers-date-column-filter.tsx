import { type JSX, useCallback, useEffect, useMemo, useState } from "react";

import { ListFilter } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "~/src/components/shadcn/popover";

import {
  CustomersDateFilterForm,
  type DateFilterDraft
} from "~/src/components/custom/pages/admin/customers/components/customers-date-filter-form";
import { customersColumnFilterTriggerClass } from "~/src/components/custom/pages/admin/customers/lib/customers-column-filter-trigger";
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
} from "~/src/components/custom/pages/admin/customers/lib/customers-date-filter";
import { customersDataGrid } from "~/src/components/custom/pages/admin/customers/utils/customers-data-grid";

const TABLE_PAGE_INDEX_START = 0;
const DEFAULT_OPERATOR = DATE_COLUMN_FILTER_OPERATOR.ON;

const DATE_FILTER_OPERATOR_LABEL_KEY: Record<DateColumnFilterOperator, string> = {
  [DATE_COLUMN_FILTER_OPERATOR.AFTER]: "filter.date.operatorAfter",
  [DATE_COLUMN_FILTER_OPERATOR.BEFORE]: "filter.date.operatorBefore",
  [DATE_COLUMN_FILTER_OPERATOR.BETWEEN]: "filter.date.operatorBetween",
  [DATE_COLUMN_FILTER_OPERATOR.ON]: "filter.date.operatorOn"
};

interface CustomersDateColumnFilterProps {
  readonly ariaLabelKey: "filter.createdAt" | "filter.lastOrderAt";
  readonly columnId: string;
  readonly labelKey: "columns.createdAt" | "columns.lastOrder";
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

/** Popover filter: date operator + one or two date fields for customer date columns. */
export function CustomersDateColumnFilter({ ariaLabelKey, columnId, labelKey }: Readonly<CustomersDateColumnFilterProps>): JSX.Element {
  const t = useTranslations("pages.admin.customers");
  const format = useFormatter();
  const { table } = customersDataGrid.useDataGrid();
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
        label: t(DATE_FILTER_OPERATOR_LABEL_KEY[operator]),
        value: operator
      })),
    [t]
  );

  const formatIsoDateLabel = useCallback(
    (isoDate: string): string => format.dateTime(new Date(parseIsoDateToStartMs(isoDate)), { dateStyle: "medium" }),
    [format]
  );

  const triggerLabel = formatDateFilterTriggerLabel({
    activeFilter,
    formatIsoDateLabel,
    idleLabel: t(labelKey)
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
      <PopoverTrigger aria-label={t(ariaLabelKey)} className={customersColumnFilterTriggerClass(activeFilter !== undefined)}>
        <ListFilter className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{t(labelKey)}</PopoverTitle>
        </PopoverHeader>

        <CustomersDateFilterForm
          draft={draft}
          onDateChange={handleDateChange}
          onEndDateChange={handleEndDateChange}
          onOperatorChange={handleOperatorChange}
          onStartDateChange={handleStartDateChange}
          operatorOptions={operatorOptions}
          t={t}
          todayIso={todayIso}
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          {activeFilter !== undefined && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              {t("filter.date.clear")}
            </Button>
          )}
          <Button type="button" size="sm" disabled={!isDraftValid(draft)} onClick={handleApply}>
            {t("filter.date.apply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
