import { useCallback, useEffect, useMemo, useState } from "react";

import { useFormatter, useTranslations } from "use-intl";

import {
  DATE_COLUMN_FILTER_OPERATOR,
  dateTimeFilterDraftFromValue,
  dateTimeFilterValueFromDraft,
  emptyDateTimeFilterDraft,
  formatDateTimeFilterTriggerLabel,
  isDateColumnFilterOperator,
  isDateTimeFilterDraftValid,
  type DateTimeColumnFilterValue,
  type DateTimeFilterDraft
} from "~/src/lib/_utils/admin-datetime-filter";
import { formatDateToIsoDateLocal } from "~/src/lib/_utils/iso-date";
import { defaultDateTimeFilterEndTime, parseIsoDateTimeLocalToMs } from "~/src/lib/_utils/iso-datetime";

import {
  buildAuditDateTimeFilterLabels,
  buildAuditDateTimeFilterOperatorOptions
} from "~/src/components/custom/pages/admin/audit/utils/audit-datetime-filter-labels";

const DEFAULT_START_TIME = "00:00";

interface UseAuditDateTimeFilterInput {
  readonly activeDateFilter: DateTimeColumnFilterValue | undefined;
  readonly applyAuditFilter: (patch: { readonly createdAt?: DateTimeColumnFilterValue | undefined }) => void;
}

export function useAuditDateTimeFilter({ activeDateFilter, applyAuditFilter }: UseAuditDateTimeFilterInput) {
  const t = useTranslations("pages.admin");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateTimeFilterDraft>(() => dateTimeFilterDraftFromValue(activeDateFilter));
  const todayIso = formatDateToIsoDateLocal(new Date());

  useEffect(() => {
    if (open) {
      setDraft(dateTimeFilterDraftFromValue(activeDateFilter));
    }
  }, [activeDateFilter, open]);

  const { labels, operatorOptions } = useMemo(() => {
    const nextLabels = buildAuditDateTimeFilterLabels(t);
    return { labels: nextLabels, operatorOptions: buildAuditDateTimeFilterOperatorOptions(nextLabels) };
  }, [t]);

  const formatIsoDateTimeLabel = useCallback(
    (isoDateTime: string): string =>
      format.dateTime(new Date(parseIsoDateTimeLocalToMs(isoDateTime)), { dateStyle: "medium", timeStyle: "short" }),
    [format]
  );

  const triggerLabel = formatDateTimeFilterTriggerLabel({
    activeFilter: activeDateFilter,
    formatIsoDateTimeLabel,
    idleLabel: t("audit.filter.dateRange")
  });

  const handleOpenChange = setOpen;

  const handleOperatorChange = useCallback((value: string | null) => {
    if (value === null || !isDateColumnFilterOperator(value)) {
      return;
    }

    setDraft((current) => {
      if (value === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
        return {
          ...current,
          endTime: current.endTime === "" ? defaultDateTimeFilterEndTime() : current.endTime,
          operator: value,
          startTime: current.startTime === "" ? DEFAULT_START_TIME : current.startTime
        };
      }

      return {
        ...current,
        operator: value,
        time: current.time === "" ? DEFAULT_START_TIME : current.time
      };
    });
  }, []);

  const handleDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      date: isoDate,
      time: current.time === "" ? DEFAULT_START_TIME : current.time
    }));
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setDraft((current) => ({ ...current, time }));
  }, []);

  const handleStartDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      startDate: isoDate,
      startTime: current.startTime === "" ? DEFAULT_START_TIME : current.startTime
    }));
  }, []);

  const handleStartTimeChange = useCallback((time: string) => {
    setDraft((current) => ({ ...current, startTime: time }));
  }, []);

  const handleEndDateChange = useCallback((isoDate: string) => {
    setDraft((current) => ({
      ...current,
      endDate: isoDate,
      endTime: current.endTime === "" ? defaultDateTimeFilterEndTime() : current.endTime
    }));
  }, []);

  const handleEndTimeChange = useCallback((time: string) => {
    setDraft((current) => ({ ...current, endTime: time }));
  }, []);

  const handleApply = useCallback(() => {
    if (!isDateTimeFilterDraftValid(draft)) {
      return;
    }

    applyAuditFilter({ createdAt: dateTimeFilterValueFromDraft(draft) });
    setOpen(false);
  }, [applyAuditFilter, draft]);

  const handleClear = useCallback(() => {
    applyAuditFilter({ createdAt: undefined });
    setDraft(emptyDateTimeFilterDraft());
    setOpen(false);
  }, [applyAuditFilter]);

  return {
    activeDateFilter,
    draft,
    handleApply,
    handleClear,
    handleDateChange,
    handleEndDateChange,
    handleEndTimeChange,
    handleOpenChange,
    handleOperatorChange,
    handleStartDateChange,
    handleStartTimeChange,
    handleTimeChange,
    isDraftValid: isDateTimeFilterDraftValid(draft),
    labels,
    open,
    operatorOptions,
    todayIso,
    triggerLabel
  };
}
