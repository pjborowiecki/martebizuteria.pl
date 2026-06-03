import { useRef } from "react";

import type { ColumnPinningState } from "@tanstack/react-table";

function readColumnPinningOrder(initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState {
  return {
    left: initialColumnPinning?.left === undefined ? undefined : [...initialColumnPinning.left],
    right: initialColumnPinning?.right === undefined ? undefined : [...initialColumnPinning.right]
  };
}

/** Pinning ids for preference sanitization — captured once so inline `initialColumnPinning` objects do not retrigger effects. */
export function useStableColumnPinning(initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState {
  const ref = useRef(readColumnPinningOrder(initialColumnPinning));
  return ref.current;
}
