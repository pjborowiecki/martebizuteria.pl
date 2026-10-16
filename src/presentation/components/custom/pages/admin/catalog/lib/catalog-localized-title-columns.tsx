import { type ColumnHelper, type RowData } from "@tanstack/react-table"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

const LOCALIZED_TITLE_COLUMN_SIZE = 200

export const catalogLocalizedTitleColumnId = (locale: SupportedLocale): string => `title-${locale}`

export const CATALOG_LOCALIZED_TITLE_COLUMN_VISIBILITY: Readonly<Record<string, boolean>> = Object.fromEntries(
  I18N.SUPPORTED_LOCALES.map((locale) => [catalogLocalizedTitleColumnId(locale), false]),
)

export const buildCatalogLocalizedTitleColumns = <TRow extends RowData & { readonly titles: Readonly<Record<SupportedLocale, string>> }>(
  columnHelper: ColumnHelper<DataGridFeatures, TRow>,
  header: (language: string) => string,
) =>
  I18N.SUPPORTED_LOCALES.map((locale) =>
    columnHelper.accessor((row) => row.titles[locale], {
      cell: ({ getValue }) => <CatalogTruncatedTextCell text={getValue()} />,
      header: header(new Intl.Locale(locale).language.toUpperCase()),
      id: catalogLocalizedTitleColumnId(locale),
      meta: {
        exportValue: (row) => row.titles[locale],
        skeletonVariant: "text",
      },
      size: LOCALIZED_TITLE_COLUMN_SIZE,
    }),
  )
