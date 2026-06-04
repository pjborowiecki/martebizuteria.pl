import { type JSX } from "react";

import { Clock, Mail, MapPin, Phone, Plus, Tag, Package } from "lucide-react";
import { useTranslations } from "use-intl";

import { Avatar, AvatarFallback } from "~/src/components/shadcn/avatar";
import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Separator } from "~/src/components/shadcn/separator";

import { CUSTOMER, TIMELINE, TIMELINE_ICONS } from "~/src/data/customer-detail-data";

export function CustomerSidebar(): JSX.Element {
  return (
    <div className="space-y-6">
      <CustomerProfileCard />
      <CustomerTagsCard />
      <CustomerNotesCard />
      <CustomerTimelineCard />
    </div>
  );
}

function CustomerProfileCard(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  return (
    <Card className="shadow-none">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar size="lg" className="h-16 w-16 rounded-lg after:rounded-lg">
            <AvatarFallback className="rounded-lg bg-foreground text-lg font-semibold text-background">{CUSTOMER.initials}</AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-base font-semibold tracking-tight">{CUSTOMER.name}</h2>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{CUSTOMER.id}</p>
          <div className="mt-3 flex gap-2">
            <Badge variant="default" className="bg-foreground text-[11px] text-background hover:bg-foreground">
              {CUSTOMER.tier}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t("profile.memberSince", { date: CUSTOMER.joinDate })}
            </Badge>
          </div>
        </div>

        <Separator className="my-5 bg-border/40" />

        <div className="space-y-3.5">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="truncate text-muted-foreground">{CUSTOMER.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">{CUSTOMER.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">{CUSTOMER.address}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">{t("profile.lastActive", { time: CUSTOMER.lastActive })}</span>
          </div>
        </div>

        <Separator className="my-5 bg-border/40" />

        <div className="space-y-3">
          <p className="text-[12px] font-medium tracking-wider text-muted-foreground/50 uppercase">{t("profile.preferences")}</p>
          <div className="flex items-center gap-3 text-sm">
            <Tag className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {t("profile.preferredCategory")}
              {": "}
              <span className="text-foreground">{CUSTOMER.preferredCategory}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Package className="size-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-muted-foreground">
              {t("profile.preferredCollection")}
              {": "}
              <span className="text-foreground">{CUSTOMER.preferredCollection}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerTagsCard(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("tags.title")}</p>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
            <Plus className="size-3.5" strokeWidth={2} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CUSTOMER.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerNotesCard(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("notes.title")}</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            {t("notes.edit")}
          </Button>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{CUSTOMER.notes}</p>
      </CardContent>
    </Card>
  );
}

function CustomerTimelineCard(): JSX.Element {
  const t = useTranslations("pages.admin.customerDetail");

  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium">{t("timeline.title")}</p>
        <div className="space-y-0">
          {TIMELINE.map((event, i) => {
            const Icon = TIMELINE_ICONS[event.type] ?? Clock;
            const eventKey = `${event.date}-${event.type}`;
            const LAST_INDEX_OFFSET = 1;
            return (
              <div key={eventKey} className="relative flex gap-3 pb-5 last:pb-0">
                {i < TIMELINE.length - LAST_INDEX_OFFSET && (
                  <div className="absolute top-6 left-[11px] h-[calc(100%-16px)] w-px bg-border/50" />
                )}
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[13px] leading-snug">{event.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/50">{event.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
