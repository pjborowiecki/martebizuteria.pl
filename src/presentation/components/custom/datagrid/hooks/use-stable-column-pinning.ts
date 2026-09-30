import { useRef } from "react"

import { type ColumnPinningState } from "@tanstack/react-table"

const readColumnPinningOrder = (initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState => ({
  end: [...(initialColumnPinning?.end ?? [])],
  start: [...(initialColumnPinning?.start ?? [])],
})

export const useStableColumnPinning = (initialColumnPinning: ColumnPinningState | undefined): ColumnPinningState => {
  const ref = useRef(readColumnPinningOrder(initialColumnPinning))

  return ref.current
}
