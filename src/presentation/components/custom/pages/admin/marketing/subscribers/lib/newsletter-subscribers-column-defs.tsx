import { type JSX } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { type useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { ADMIN_NEWSLETTER_TABLE_COLUMN_ID, ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { type useFormatter } from "~/src/hooks/use-display-format"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CATALOG_RECORD_ID_COLUMN_META } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CATALOG_DATAGRID_MUTED_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { NewsletterSubscriberAccountCell } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscriber-account-cell"
import { NewsletterSubscriberStatusBadge } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscriber-status-badge"
import { NewsletterSubscribersRowActions } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-row-actions"

const DateCell = ({ format, value }: Readonly<{ format: ColumnsInput["format"]; value: Date | undefined }>): JSX.Element =>
  value === undefined ? (
    <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>{EMPTY_VALUE}</span>
  ) : (
    <span className="whitespace-nowrap text-muted-foreground">{format.dateTime(value, { dateStyle: "medium" })}</span>
  )

const formatOptionalDate = (format: ColumnsInput["format"], value: Date | undefined): string | undefined =>
  value === undefined ? undefined : format.dateTime(value, { dateStyle: "medium" })

const buildSubscriberIdentityColumns = ({ t, tAdmin }: Pick<ColumnsInput, "t" | "tAdmin">) =>
  columnHelper.columns([
    columnHelper.accessor("email", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell className="text-[13px] font-medium" muted={false} text={getValue()} />,
      header: t("columns.email"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.email,
      meta: {
        exportValue: (row) => row.email,
        skeletonVariant: "title",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.email,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.email,
    }),
    columnHelper.accessor("id", {
      cell: ({ getValue }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{getValue()}</span>,
      header: t("columns.id"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.recordId,
      meta: { ...CATALOG_RECORD_ID_COLUMN_META, exportValue: (row) => row.id },
      ...fixedDataGridColumnWidth(ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.recordId),
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => <NewsletterSubscriberStatusBadge status={getValue()} />,
      header: t("columns.status"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.status,
      meta: {
        exportValue: (row) => t(`status.${row.status}`),
        skeletonVariant: "badge",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.status,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("locale", {
      cell: ({ getValue }) => (
        <span className={CATALOG_DATAGRID_MUTED_TEXT_CLASS}>{tAdmin(`content.editor.localeNames.${getValue()}`)}</span>
      ),
      header: t("columns.locale"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.locale,
      meta: {
        exportValue: (row) => tAdmin(`content.editor.localeNames.${row.locale}`),
        skeletonVariant: "text",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.locale,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.locale,
    }),
    columnHelper.accessor("source", {
      cell: ({ getValue }) => <span className={CATALOG_DATAGRID_MUTED_TEXT_CLASS}>{t(`source.${getValue()}`)}</span>,
      header: t("columns.source"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.source,
      meta: {
        exportValue: (row) => t(`source.${row.source}`),
        fillsRemainingWidth: true,
        skeletonVariant: "text",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.source,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.source,
    }),
    columnHelper.accessor("userId", {
      cell: ({ getValue }) => <NewsletterSubscriberAccountCell userId={getValue()} />,
      enableSorting: false,
      header: t("columns.account"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.account,
      meta: {
        exportValue: (row) => row.userId,
        skeletonVariant: "text",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.account,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.account,
    }),
  ])

const buildSubscriberDateColumns = ({ format, t }: Pick<ColumnsInput, "format" | "t">) =>
  columnHelper.columns([
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.createdAt"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.createdAt,
      meta: {
        exportValue: (row) => formatOptionalDate(format, row.createdAt),
        skeletonVariant: "date",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.createdAt,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.accessor("confirmedAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.confirmedAt"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.confirmedAt,
      meta: {
        exportValue: (row) => formatOptionalDate(format, row.confirmedAt),
        skeletonVariant: "date",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.confirmedAt,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.confirmedAt,
    }),
    columnHelper.accessor("unsubscribedAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.unsubscribedAt"),
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.unsubscribedAt,
      meta: {
        exportValue: (row) => formatOptionalDate(format, row.unsubscribedAt),
        skeletonVariant: "date",
      },
      minSize: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.unsubscribedAt,
      size: ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.unsubscribedAt,
    }),
    columnHelper.display({
      cell: ({ row }) => <NewsletterSubscribersRowActions subscriber={row.original} />,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      id: ADMIN_NEWSLETTER_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(ADMIN_NEWSLETTER_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const buildNewsletterSubscriberColumns = (input: ColumnsInput) =>
  columnHelper.columns([...buildSubscriberIdentityColumns(input), ...buildSubscriberDateColumns(input)])

const columnHelper = createColumnHelper<DataGridFeatures, Newsletter["adminListItem"]>()

interface ColumnsInput {
  readonly format: ReturnType<typeof useFormatter>
  readonly t: ReturnType<typeof useTranslations<"pages.admin.marketing.subscribers">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
