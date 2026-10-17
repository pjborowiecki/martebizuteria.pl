import { useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import {
  CUSTOMER_ACCOUNT_LOGIN_STATUS,
  LOGIN_HISTORY_TABLE_COLUMN_ID,
  LOGIN_HISTORY_TABLE_COLUMN_SIZE,
} from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { CATALOG_DATAGRID_EMPTY_TEXT_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

const columnHelper = createColumnHelper<DataGridFeatures, CustomerAccount["loginHistoryItem"]>()

const buildLoginHistoryColumns = ({ format, t }: LoginHistoryColumnContext) =>
  columnHelper.columns([
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => (
        <span className="tabular-nums">{format.dateTime(getValue(), { dateStyle: "medium", timeStyle: "medium" })}</span>
      ),
      enableSorting: false,
      header: t("columns.createdAt"),
      id: LOGIN_HISTORY_TABLE_COLUMN_ID.createdAt,
      meta: { exportValue: (row) => format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "medium" }), skeletonVariant: "date" },
      size: LOGIN_HISTORY_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => (
        <SettingsStatusBadge
          label={t(`status.${getValue()}`)}
          tone={getValue() === CUSTOMER_ACCOUNT_LOGIN_STATUS.SUCCESS ? "positive" : "negative"}
        />
      ),
      enableSorting: false,
      header: t("columns.status"),
      id: LOGIN_HISTORY_TABLE_COLUMN_ID.status,
      meta: { exportValue: (row) => t(`status.${row.status}`), skeletonVariant: "badge" },
      size: LOGIN_HISTORY_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("ipAddress", {
      cell: ({ getValue }) => {
        const ipAddress = getValue()

        return ipAddress === undefined ? (
          <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>{t("unknownAddress")}</span>
        ) : (
          <span className="font-mono text-xs">{ipAddress}</span>
        )
      },
      enableSorting: false,
      header: t("columns.ipAddress"),
      id: LOGIN_HISTORY_TABLE_COLUMN_ID.ipAddress,
      meta: { exportValue: (row) => row.ipAddress, fillsRemainingWidth: true, skeletonVariant: "text" },
      size: LOGIN_HISTORY_TABLE_COLUMN_SIZE.ipAddress,
    }),
  ])

export const useLoginHistoryColumns = () => {
  const t = useTranslations("pages.admin.settings.security.history")
  const format = useFormatter()

  return useMemo(() => buildLoginHistoryColumns({ format, t }), [format, t])
}

interface LoginHistoryColumnContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly t: ReturnType<typeof useTranslations<"pages.admin.settings.security.history">>
}
