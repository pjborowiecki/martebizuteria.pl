import { type JSX, useCallback } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Copy, Eye, MoreHorizontal, Search } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { cn } from "~/src/lib/utils";

import { Avatar, AvatarFallback } from "~/src/components/shadcn/avatar";
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

import { CUSTOMERS } from "~/src/data/customers-data";

const TIER_STYLES: Record<string, { variant: "default" | "secondary" | "outline"; className?: string }> = {
  Gold: { variant: "outline" },
  Standard: { variant: "secondary" },
  VIP: { className: "bg-foreground text-background hover:bg-foreground", variant: "default" }
};

export function CustomerListTable(): JSX.Element {
  const t = useTranslations("admin");

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
              placeholder={t("customers.searchPlaceholder")}
              className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto **:data-[slot=table-container]:overflow-visible">
          <Table>
            <CustomerTableHeader />
            <TableBody>
              {CUSTOMERS.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </TableBody>
          </Table>
        </div>

        <CustomerTablePagination />
      </CardContent>
    </Card>
  );
}

function CustomerTableHeader(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <TableHeader className="sticky top-0 z-10 bg-background/40 backdrop-blur-md">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="pl-0 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.customer")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.status")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.location")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.orders")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.spent")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("customers.columns.lastOrder")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}

function CustomerTablePagination(): JSX.Element {
  const t = useTranslations("admin");

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

function CustomerRow({ customer }: { readonly customer: (typeof CUSTOMERS)[number] }): JSX.Element {
  const navigate = useNavigate();

  const tierStyle = TIER_STYLES[customer.tier] ?? { variant: "secondary" };

  const handleRowClick = useCallback(() => {
    void navigate({ params: { id: customer.id }, to: `/${CONSTANTS.ROUTES.ADMIN_CUSTOMER}` });
  }, [navigate, customer.id]);

  const handleCopyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(customer.id);
    },
    [customer.id]
  );

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow className="group cursor-pointer" onClick={handleRowClick}>
      <TableCell className="pl-6">
        <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="rounded-md after:rounded-md">
            <AvatarFallback className="rounded-md bg-secondary text-[13px] font-medium">{customer.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{customer.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-mono">{customer.number}</span>
              <span className="mx-1.5 text-muted-foreground/30">·</span>
              {customer.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{customer.location}</TableCell>
      <TableCell className="text-center font-mono text-sm">{customer.orders}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{customer.spent}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{customer.lastOrder}</TableCell>
      <TableCell>
        <Badge variant={tierStyle.variant} className={cn("text-[11px]", tierStyle.className)}>
          {customer.tier}
        </Badge>
      </TableCell>
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
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]" onClick={handleCopyClick}>
              <Copy className="size-4" strokeWidth={1.5} />
              Copy customer ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]" onClick={handleRowClick}>
              <Eye className="size-4" strokeWidth={1.5} />
              View details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
