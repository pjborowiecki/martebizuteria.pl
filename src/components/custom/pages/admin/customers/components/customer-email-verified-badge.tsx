import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CatalogStatusBadge } from "~/src/components/custom/pages/admin/catalog/table/components/catalog-status-badge";

import { ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS } from "~/src/modules/user/user.constants";

export function CustomerEmailVerifiedBadge({ emailVerified }: Readonly<{ emailVerified: boolean }>): JSX.Element {
  const t = useTranslations("pages.admin.customers");

  return (
    <CatalogStatusBadge
      isActive={emailVerified}
      label={t(emailVerified ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no)}
    />
  );
}
