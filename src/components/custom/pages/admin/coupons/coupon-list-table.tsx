import { type JSX, type MouseEvent, useCallback } from "react";

import { Copy, Eye, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { COUPONS } from "~/src/data/coupons-data";

const STATUS_STYLES = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none",
  expired: "bg-muted text-muted-foreground border-none",
  scheduled: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none"
} as const;

export function CouponListTable(): JSX.Element {
  return (
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
              aria-label="Search coupons"
              placeholder="Search coupons..."
              className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto **:data-[slot=table-container]:overflow-visible">
          <Table>
            <CouponTableHeader />
            <TableBody>
              {COUPONS.map((coupon) => (
                <CouponRow key={coupon.id} coupon={coupon} />
              ))}
            </TableBody>
          </Table>
        </div>

        <CouponTablePagination />
      </CardContent>
    </Card>
  );
}

function CouponTableHeader(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <TableHeader className="sticky top-0 z-10 bg-background/40 backdrop-blur-md">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          <input type="checkbox" aria-label={t("a11y.selectAll")} className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="pl-0 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.code")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">{t("coupons.columns.type")}</TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.discount")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.minOrder")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.usage")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.status")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("coupons.columns.expires")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}

function CouponTablePagination(): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-6 py-4">
      <p className="text-sm text-muted-foreground">{t("customers.pagination.showing")}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
          {t("customers.pagination.previous")}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          {t("customers.pagination.next")}
        </Button>
      </div>
    </div>
  );
}

function CouponRow({ coupon }: { readonly coupon: (typeof COUPONS)[number] }): JSX.Element {
  const t = useTranslations("pages.admin");

  const statusStyle = STATUS_STYLES[coupon.status];
  const statusLabel = {
    active: t("coupons.status.active"),
    expired: t("coupons.status.expired"),
    scheduled: t("coupons.status.scheduled")
  }[coupon.status];

  const handleCopyCodeClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(coupon.code);
    },
    [coupon.code]
  );

  const stopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <input type="checkbox" aria-label={t("a11y.selectRow")} className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell className="pl-0">
        <div className="flex items-center gap-2">
          <code className="rounded-md bg-secondary px-2.5 py-1 font-mono text-sm font-medium">{coupon.code}</code>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleCopyCodeClick}
          >
            <Copy className="size-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{coupon.type}</TableCell>
      <TableCell className="font-mono text-sm font-semibold">{coupon.discount}</TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{coupon.minOrder}</TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{coupon.usage}</TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[11px]", statusStyle)}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{coupon.expires}</TableCell>
      <TableCell className="pr-6" onClick={stopPropagation}>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal className="size-4" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52 p-1.5">
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]">
              <Copy className="size-4" strokeWidth={1.5} />
              Duplicate coupon
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]">
              <Eye className="size-4" strokeWidth={1.5} />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px] text-red-600 dark:text-red-500">
              <Trash2 className="size-4" strokeWidth={1.5} />
              Delete coupon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
