import { type JSX, type MouseEvent, useCallback } from "react";

import { Copy, Eye, MoreHorizontal, Search } from "lucide-react";
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

import { CAMPAIGNS } from "~/src/data/marketing-data";

const STATUS_STYLE_MAP = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none",
  completed: "bg-muted text-muted-foreground border-none",
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none"
} as const;

const TYPE_STYLE_MAP = {
  Email: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none",
  SMS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none",
  Social: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-none"
} as const;

export function MarketingCampaignsTable(): JSX.Element {
  return (
    <Card className="flex flex-col border-border/40 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
      <CardContent className="flex flex-col p-0">
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto **:data-[slot=table-container]:overflow-visible">
          <Table>
            <CampaignTableHeader />
            <TableBody>
              {CAMPAIGNS.map((c) => (
                <CampaignRow key={c.id} campaign={c} />
              ))}
            </TableBody>
          </Table>
        </div>

        <CampaignTablePagination />
      </CardContent>
    </Card>
  );
}

function CampaignTableHeader(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <TableHeader className="bg-background/40 backdrop-blur-md">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="pl-0 text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.campaign")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.type")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.status")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.sent")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.openRate")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("marketing.campaigns.columns.revenue")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}

function CampaignTablePagination(): JSX.Element {
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

function CampaignRow({ campaign }: { readonly campaign: (typeof CAMPAIGNS)[number] }): JSX.Element {
  const t = useTranslations("admin");

  const statusStyle = STATUS_STYLE_MAP[campaign.status];
  const typeStyle = TYPE_STYLE_MAP[campaign.type];
  const statusLabel = {
    active: t("marketing.status.active"),
    completed: t("marketing.status.completed"),
    draft: t("marketing.status.draft")
  }[campaign.status];

  const stopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow className="group cursor-pointer">
      <TableCell className="pl-6">
        <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell className="pl-0">
        <div>
          <p className="text-sm font-medium">{campaign.name}</p>
          <p className="text-xs text-muted-foreground">{campaign.date}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[11px]", typeStyle)}>
          {campaign.type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[11px]", statusStyle)}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-muted-foreground">{campaign.sent}</TableCell>
      <TableCell className="text-right font-mono text-sm text-muted-foreground">{campaign.openRate}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{campaign.revenue}</TableCell>
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
              Duplicate campaign
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]">
              <Eye className="size-4" strokeWidth={1.5} />
              View details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
