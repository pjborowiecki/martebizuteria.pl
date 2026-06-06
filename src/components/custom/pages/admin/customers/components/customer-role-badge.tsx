import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { ROLES } from "~/src/constants/_constants/permissions";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";

import { ADMIN_CUSTOMER_ROLE_LABEL_KEYS } from "~/src/modules/user/user.constants";
import type { User } from "~/src/modules/user/user.types";

const ROLE_BADGE_BASE_CLASS = "h-5 border-0 px-2 py-0.5 text-[11px] font-medium";

const ROLE_BADGE_CLASS = {
  admin: "bg-foreground text-background",
  customer: "bg-secondary text-muted-foreground"
} as const;

export function CustomerRoleBadge({ role }: Readonly<{ role: User["select"]["role"] }>): JSX.Element {
  const t = useTranslations("pages.admin.customers");
  const isAdmin = role === ROLES.ADMIN;
  const labelKey = isAdmin ? ADMIN_CUSTOMER_ROLE_LABEL_KEYS.admin : ADMIN_CUSTOMER_ROLE_LABEL_KEYS.customer;

  return (
    <Badge variant="outline" className={cn(ROLE_BADGE_BASE_CLASS, isAdmin ? ROLE_BADGE_CLASS.admin : ROLE_BADGE_CLASS.customer)}>
      {t(labelKey)}
    </Badge>
  );
}
