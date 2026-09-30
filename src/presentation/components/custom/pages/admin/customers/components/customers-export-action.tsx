import { type JSX, useCallback, useMemo, useState } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { exportAdminCustomers } from "~/src/modules/user/use-cases/export-admin-customers"
import {
  ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS,
  ADMIN_CUSTOMER_ROLE_LABEL_KEYS,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { formatAdminCustomerLocation } from "~/src/modules/user/user.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { useCustomersDataGridContext } from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-customers-data-grid"

export const CustomersExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const locale = useLocale()
  const format = useFormatter()
  const { exportListInput } = useCustomersDataGridContext()
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = useCallback(() => {
    void (async () => {
      setIsExporting(true)
      try {
        const customers = await exportAdminCustomers({
          data: exportListInput,
        })

        const headers = [
          "ID",
          "Stripe Customer ID",
          "Name",
          "Email",
          "Role",
          "Phone",
          "Email Verified",
          "Banned",
          "Location",
          "Orders",
          "Total Spent",
          "Average Order Value",
          "Last Order",
          "Account Created",
        ]

        const csvContent = [
          headers.join(","),
          ...customers.map((customer) => {
            const location =
              formatAdminCustomerLocation(
                customer.city === undefined || customer.countryCode === undefined
                  ? undefined
                  : {
                      city: customer.city,
                      countryCode: customer.countryCode,
                      province: customer.province,
                    },
              ) ?? ""
            const lastOrder =
              customer.lastOrderAt === undefined
                ? ""
                : format.dateTime(new Date(customer.lastOrderAt), {
                    dateStyle: "medium",
                  })
            const createdAt = format.dateTime(new Date(customer.createdAt), {
              dateStyle: "medium",
            })

            const roleLabel = t(
              customer.role === ROLES.ADMIN ? ADMIN_CUSTOMER_ROLE_LABEL_KEYS.admin : ADMIN_CUSTOMER_ROLE_LABEL_KEYS.customer,
            )

            const emailVerifiedLabel = t(
              customer.emailVerified ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no,
            )

            const bannedLabel = t(customer.banned === true ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no)

            return [
              customer.id,
              customer.stripeCustomerId ?? "",
              `"${escapeCsvField(customer.name)}"`,
              customer.email,
              roleLabel,
              customer.phone ?? "",
              emailVerifiedLabel,
              bannedLabel,
              `"${escapeCsvField(location)}"`,
              customer.orderCount,
              formatPrice(customer.totalSpent, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale),
              formatPrice(customer.averageOrderValue, DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale),
              `"${escapeCsvField(lastOrder)}"`,
              `"${escapeCsvField(createdAt)}"`,
            ].join(",")
          }),
        ].join("\n")
        downloadCsvFile("customers.csv", csvContent)
      } finally {
        setIsExporting(false)
      }
    })()
  }, [exportListInput, format, locale, t])

  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("actions.exportCsv")}
        aria-busy={isExporting}
        disabled={isExporting}
        onClick={handleExport}
      >
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, isExporting, t],
  )

  return <DataGridIconTooltip label={t("actions.exportCsv")} trigger={button} />
}
