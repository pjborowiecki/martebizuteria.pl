import { type JSX, type MouseEvent, useCallback } from "react"

import { cn } from "cn"
import { Copy, ExternalLink, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PAGES } from "~/src/data/content"

const FIRST_ROW_LABEL = "1"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

export const ContentListTable = (): JSX.Element => (
  <Card className="flex min-h-0 flex-1 flex-col border-border/40 bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
    <CardContent className="flex min-h-0 flex-1 flex-col p-0">
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
            strokeWidth={1.5}
          />
          <input
            type="text"
            aria-label="Search pages"
            placeholder="Search pages..."
            className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto **:data-[slot=table-container]:overflow-visible">
        <Table>
          <ContentTableHeader />
          <TableBody>
            {PAGES.map((page) => (
              <ContentRow key={page.id} page={page} />
            ))}
          </TableBody>
        </Table>
      </div>

      <ContentTablePagination />
    </CardContent>
  </Card>
)

const rowActionsTrigger = (
  <Button variant="ghost" size="icon" className="size-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
    <MoreHorizontal className="size-4" strokeWidth={1.5} />
  </Button>
)

const ContentTableHeader = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <TableHeader className="sticky top-0 z-10 bg-background/40 backdrop-blur-md">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          <input type="checkbox" aria-label={t("a11y.selectAll")} className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="pl-0 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("content.pagesTable.columns.title")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("content.pagesTable.columns.path")}
        </TableHead>
        <TableHead className="text-center text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("content.pagesTable.columns.sections")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("content.pagesTable.columns.lastEdited")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("content.pagesTable.columns.status")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  )
}

const ContentTablePagination = (): JSX.Element => {
  const t = useTranslations("components.datagrid.pagination")

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-6 py-4">
      <p className="text-sm text-muted-foreground">
        {t("showing", { count: String(PAGES.length), from: FIRST_ROW_LABEL, to: String(PAGES.length) })}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
          {t("previous")}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          {t("next")}
        </Button>
      </div>
    </div>
  )
}

const ContentRow = ({ page }: { readonly page: (typeof PAGES)[number] }): JSX.Element => {
  const t = useTranslations("pages.admin")
  const statusStyle = STATUS_STYLES[page.status]
  const statusLabel = {
    draft: t("content.status.draft"),
    published: t("content.status.published"),
  }[page.status]

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <input type="checkbox" aria-label={t("a11y.selectRow")} className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell className="pl-0 text-sm font-medium">{page.title}</TableCell>
      <TableCell>
        <code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">{page.path}</code>
      </TableCell>
      <TableCell className="text-center font-mono text-sm text-muted-foreground">{page.sections}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{page.lastEdited}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[11px]", statusStyle)}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="pr-6" onClick={stopPropagation}>
        <DropdownMenu>
          <DropdownMenuTrigger render={rowActionsTrigger} />
          <DropdownMenuContent align="end" className="min-w-52 p-1.5">
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]">
              <ExternalLink className="size-4" strokeWidth={1.5} />
              Open in editor
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]">
              <Copy className="size-4" strokeWidth={1.5} />
              Duplicate page
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px] text-red-600 dark:text-red-500">
              <Trash2 className="size-4" strokeWidth={1.5} />
              Delete page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

const STATUS_STYLES = {
  draft: "bg-muted text-muted-foreground border-none",
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none",
} as const
