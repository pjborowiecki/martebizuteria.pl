import { type CSSProperties, type ComponentProps, type JSX, forwardRef } from "react"

import { cn } from "cn"

const DataTable = ({ className, style, ...props }: ComponentProps<"table">): JSX.Element => (
  <table
    data-slot="data-table"
    className={cn("min-w-0 table-fixed caption-bottom border-separate border-spacing-0 text-xs", className)}
    style={style}
    {...props}
  />
)

const dataTableContentStyle = ({ containerWidthPx, layoutWidthPx, minWidthPx }: DataTableContentStyleInput): CSSProperties => {
  const contentWidth = Math.max(minWidthPx, layoutWidthPx)
  if (containerWidthPx <= 0) {
    return {
      minWidth: minWidthPx,
      width: "100%",
    }
  }

  return {
    minWidth: minWidthPx,
    width: `${Math.max(contentWidth, containerWidthPx)}px`,
  }
}

const DataTableContainer = forwardRef<HTMLDivElement, ComponentProps<"div">>(({ className, ...props }, ref): JSX.Element => (
  <div ref={ref} data-slot="data-table-container" className={cn("relative w-full min-w-0", className)} {...props} />
))

interface DataTableContentStyleInput {
  readonly containerWidthPx: number
  readonly layoutWidthPx: number
  readonly minWidthPx: number
}

export { DataTable, DataTableContainer, dataTableContentStyle }
