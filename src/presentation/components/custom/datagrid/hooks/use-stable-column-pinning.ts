import { useRef } from "react"

import { type ColumnPinningState } from "@tanstack/react-table"

const readColumnPinningOrder = (initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState => ({
  end: [...(initialColumnPinning?.end ?? [])],
  start: [...(initialColumnPinning?.start ?? [])],
})

/** Pinning ids for preference sanitization — captured once so inline `initialColumnPinning` objects do not retrigger effects. */
export const useStableColumnPinning = (initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState => {
  const ref = useRef(readColumnPinningOrder(initialColumnPinning))
  return ref.current
}
