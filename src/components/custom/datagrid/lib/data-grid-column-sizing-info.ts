import type { ColumnSizingInfoState } from "@tanstack/react-table";

/** TanStack Table idle resize state (`null` sentinels per upstream `ColumnSizing` feature). */
const TANSTACK_IDLE_COLUMN_SIZING_INFO_JSON =
  '{"columnSizingStart":[],"deltaOffset":null,"deltaPercentage":null,"isResizingColumn":false,"startOffset":null,"startSize":null}';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isColumnSizingInfoState(value: unknown): value is ColumnSizingInfoState {
  if (!isRecord(value)) {
    return false;
  }

  const record = value;

  return (
    Array.isArray(record.columnSizingStart) &&
    (record.deltaOffset === null || typeof record.deltaOffset === "number") &&
    (record.deltaPercentage === null || typeof record.deltaPercentage === "number") &&
    (record.isResizingColumn === false || typeof record.isResizingColumn === "string") &&
    (record.startOffset === null || typeof record.startOffset === "number") &&
    (record.startSize === null || typeof record.startSize === "number")
  );
}

function parseIdleColumnSizingInfo(): ColumnSizingInfoState {
  const parsed: unknown = JSON.parse(TANSTACK_IDLE_COLUMN_SIZING_INFO_JSON);
  if (!isColumnSizingInfoState(parsed)) {
    throw new Error("Invalid TanStack Table idle column sizing info JSON.");
  }
  return parsed;
}

export const DEFAULT_COLUMN_SIZING_INFO = parseIdleColumnSizingInfo();

/** Resets transient resize fields while preserving any other `columnSizingInfo` state. */
export function idleColumnSizingInfo(current: ColumnSizingInfoState): ColumnSizingInfoState {
  return { ...current, ...DEFAULT_COLUMN_SIZING_INFO };
}
