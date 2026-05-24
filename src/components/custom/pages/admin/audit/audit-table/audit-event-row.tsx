import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { TableCell, TableRow } from "~/src/components/shadcn/table";

import { AuditActorCell } from "~/src/components/custom/pages/admin/audit/audit-table/audit-actor-cell";

import { type AuditEvent, ACTOR_ROLE_COLORS, SEVERITY_BADGE_COLORS } from "~/src/data/audit-data";

const EMPTY_VALUE = "—";
const ACTION_DOT_REGEX = /\./gu;

export function AuditEventRow({ event }: { readonly event: AuditEvent }): JSX.Element {
  const t = useTranslations("admin");

  const badgeColor = SEVERITY_BADGE_COLORS[event.severity];
  const roleColor = ACTOR_ROLE_COLORS[event.actor.role];
  const actionKey = event.action.replace(ACTION_DOT_REGEX, "_");

  return (
    <TableRow className="group">
      <TableCell className="pl-6">
        <Badge className={`border-0 text-[10px] ${badgeColor}`} variant="secondary">
          {t(`audit.severity.${event.severity}`)}
        </Badge>
      </TableCell>
      <TableCell className="truncate text-xs font-medium">{t(`audit.actions.${actionKey}`)}</TableCell>
      <TableCell className="truncate font-mono text-[11px] text-muted-foreground/50">{event.target}</TableCell>
      <TableCell className="max-w-0 truncate text-xs text-muted-foreground">{event.detail ?? EMPTY_VALUE}</TableCell>
      <TableCell>
        <Badge className="border-0 text-[10px]" variant="secondary">
          {t(`audit.categories.${event.category}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <AuditActorCell initials={event.actor.initials} name={event.actor.name} roleColor={roleColor} />
      </TableCell>
      <TableCell className="font-mono text-[11px] text-muted-foreground/60">{event.timestamp}</TableCell>
      <TableCell className="pr-6 font-mono text-[10px] text-muted-foreground/40">{event.ip ?? EMPTY_VALUE}</TableCell>
    </TableRow>
  );
}
