import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Globe, LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { LocalizedLink } from "~/src/components/custom/localized-link";

interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

const SESSIONS: Session[] = [
  {
    browser: "Chrome 120",
    device: "MacBook Pro",
    deviceType: "desktop",
    id: "s1",
    ip: "185.238.xxx.xxx",
    isCurrent: true,
    lastActive: "Active now",
    location: "Warsaw, Poland"
  },
  {
    browser: "Safari 17",
    device: "iPhone 15 Pro",
    deviceType: "mobile",
    id: "s2",
    ip: "185.238.xxx.xxx",
    isCurrent: false,
    lastActive: "2 hours ago",
    location: "Warsaw, Poland"
  },
  {
    browser: "Safari 17",
    device: "iPad Air",
    deviceType: "tablet",
    id: "s3",
    ip: "185.238.xxx.xxx",
    isCurrent: false,
    lastActive: "3 days ago",
    location: "Warsaw, Poland"
  },
  {
    browser: "Firefox 121",
    device: "Windows PC",
    deviceType: "desktop",
    id: "s4",
    ip: "151.47.xxx.xxx",
    isCurrent: false,
    lastActive: "Dec 15, 2024",
    location: "Milan, Italy"
  }
];

const LOGIN_HISTORY = [
  {
    date: "Dec 18, 2024 — 14:32",
    device: "MacBook Pro · Chrome",
    location: "Warsaw, Poland",
    status: "success" as const
  },
  {
    date: "Dec 18, 2024 — 09:15",
    device: "iPhone 15 Pro · Safari",
    location: "Warsaw, Poland",
    status: "success" as const
  },
  {
    date: "Dec 17, 2024 — 22:48",
    device: "Unknown · Chrome",
    location: "Moscow, Russia",
    status: "blocked" as const
  },
  {
    date: "Dec 15, 2024 — 11:30",
    device: "Windows PC · Firefox",
    location: "Milan, Italy",
    status: "success" as const
  },
  {
    date: "Dec 14, 2024 — 16:05",
    device: "MacBook Pro · Chrome",
    location: "Warsaw, Poland",
    status: "success" as const
  },
  {
    date: "Dec 12, 2024 — 08:20",
    device: "iPad Air · Safari",
    location: "Warsaw, Poland",
    status: "success" as const
  }
];

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet
};

export const Route = createFileRoute("/{-$locale}/account/sessions")({
  component: SessionsPage
});

function ActiveSessionCard({ session }: Readonly<{ session: Session }>): JSX.Element {
  const t = useTranslations("account.sessions");
  const DeviceIcon = DEVICE_ICONS[session.deviceType];

  return (
    <div className="group flex items-center gap-5 py-5">
      <div className="flex size-10 shrink-0 items-center justify-center bg-muted/50">
        <DeviceIcon className="size-4 text-muted-foreground" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] tracking-[0.02em]">{session.device}</p>
          {session.isCurrent ? (
            <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase">
              <span className="size-1.5 rounded-full bg-green-500" />
              {t("current")}
            </span>
          ) : undefined}
        </div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {session.browser} {"· "}
          {session.location}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">{session.lastActive}</p>
      </div>
      {session.isCurrent ? undefined : (
        <Button variant="ghost" size="icon-xs" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <LogOut className="size-4 text-muted-foreground transition-colors hover:text-destructive" strokeWidth={1.5} />
        </Button>
      )}
    </div>
  );
}

function LoginHistoryItem({ entry }: Readonly<{ entry: (typeof LOGIN_HISTORY)[number] }>): JSX.Element {
  const t = useTranslations("account.sessions");

  return (
    <div className="flex items-center gap-5 py-4">
      <div className="flex size-8 shrink-0 items-center justify-center">
        <Globe className="size-3.5 text-muted-foreground/40" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px]">{entry.device}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.location}</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground tabular-nums">{entry.date}</p>
        <p
          className={`mt-0.5 text-[10px] tracking-widest uppercase ${
            entry.status === "blocked" ? "text-destructive" : "text-muted-foreground/50"
          }`}
        >
          {t(`loginStatus.${entry.status}`)}
        </p>
      </div>
    </div>
  );
}

function SessionsPage(): JSX.Element {
  const t = useTranslations("account.sessions");

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("activeSessions")}</h2>
          <Button variant="account-ghost" className="text-destructive/70 hover:text-destructive">
            {t("revokeAll")}
          </Button>
        </div>
        <Separator className="mt-3 mb-0" />

        <div className="divide-y divide-border">
          {SESSIONS.map((session) => (
            <ActiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("loginHistory")}</h2>
        <Separator className="mt-3 mb-0" />

        <div className="divide-y divide-border">
          {LOGIN_HISTORY.map((entry) => (
            <LoginHistoryItem key={`${entry.date}-${entry.status}`} entry={entry} />
          ))}
        </div>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("securityTips")}</h2>
        <Separator className="mt-3 mb-4" />
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted-foreground">
          <li>{t("tip1")}</li>
          <li>{t("tip2")}</li>
          <li>{t("tip3")}</li>
        </ul>
      </section>

      <Separator className="my-10" />

      <section>
        <h2 className="text-[11px] tracking-[0.2em] text-destructive/70 uppercase">{t("closeAccount")}</h2>
        <Separator className="mt-3 mb-0" />
        <div className="flex items-start gap-4 py-5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive/60" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px]">{t("closeAccountTitle")}</p>
            <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("closeAccountDesc")}</p>
            <LocalizedLink
              to={CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}
              className="mt-4 inline-flex h-9 items-center justify-center border border-destructive/30 px-6 text-[11px] tracking-[0.15em] text-destructive uppercase transition-colors hover:border-destructive hover:bg-destructive/5"
            >
              {t("closeAccountAction")}
            </LocalizedLink>
          </div>
        </div>
      </section>
    </div>
  );
}
