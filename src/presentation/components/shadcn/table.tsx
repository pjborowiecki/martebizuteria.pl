import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"

const Table = ({ className, ...props }: ComponentProps<"table">): JSX.Element => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table data-slot="table" className={cn("w-full caption-bottom text-xs", className)} {...props} />
  </div>
)

const TableHeader = ({ className, ...props }: ComponentProps<"thead">): JSX.Element => (
  <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
)

const TableBody = ({ className, ...props }: ComponentProps<"tbody">): JSX.Element => (
  <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
)

const TableFooter = ({ className, ...props }: ComponentProps<"tfoot">): JSX.Element => (
  <tfoot
    data-slot="table-footer"
    className={cn("border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
)

const TableRow = ({ className, ...props }: ComponentProps<"tr">): JSX.Element => (
  <tr data-slot="table-row" className={cn("border-b border-border transition-colors", className)} {...props} />
)

const TableHead = ({ className, ...props }: ComponentProps<"th">): JSX.Element => (
  <th
    data-slot="table-head"
    className={cn(
      "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
)

const TableCell = ({ className, ...props }: ComponentProps<"td">): JSX.Element => (
  <td data-slot="table-cell" className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...props} />
)

const TableCaption = ({ className, ...props }: ComponentProps<"caption">): JSX.Element => (
  <caption data-slot="table-caption" className={cn("mt-4 text-xs text-muted-foreground", className)} {...props} />
)

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
