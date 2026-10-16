import { useCallback, useEffect, useMemo, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { type PaginationState } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { LIST_PAGE_STEP } from "~/src/modules/_core/utils/pagination"
import {
  ADMIN_NEWSLETTER_PAGE_SIZE,
  ADMIN_NEWSLETTER_TABLE_COLUMN_PINNING,
  ADMIN_NEWSLETTER_TABLE_DEFAULT_COLUMN_VISIBILITY,
  type NewsletterStatus,
} from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { getAdminNewsletterPageQuery } from "~/src/modules/newsletter/use-cases/get-admin-newsletter-page"

import { useAdminDebouncedTableSearch } from "~/src/presentation/components/custom/datagrid/hooks/use-admin-debounced-table-search"
import { useDataGridInstance } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-instance"
import { type DataGridContextValue } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"
import { getDataGridColumnIds } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { useNewsletterSubscriberColumns } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-columns"
import { useNewsletterSubscribersExportSource } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-export-source"
import { newsletterSubscribersDataGrid } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/utils/newsletter-subscribers-data-grid"

const FIRST_PAGE_INDEX = 0

export const useNewsletterSubscribersDataGrid = ({
  initialStatus,
}: UseNewsletterSubscribersDataGridOptions): NewsletterSubscribersDataGridValue => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: FIRST_PAGE_INDEX,
    pageSize: ADMIN_NEWSLETTER_PAGE_SIZE,
  })

  const [serverSearch, setServerSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState(initialStatus)
  const exportListInput = useMemo(
    (): Newsletter["adminExportInput"] => ({ search: serverSearch === "" ? undefined : serverSearch, status: activeStatus }),
    [activeStatus, serverSearch],
  )

  const {
    data = EMPTY_NEWSLETTER_SUBSCRIBERS_PAGE,
    isFetching,
    isPending,
  } = useQuery({
    ...getAdminNewsletterPageQuery({ ...exportListInput, page: pagination.pageIndex + LIST_PAGE_STEP, pageSize: pagination.pageSize }),
    placeholderData: keepPreviousData,
  })

  const columns = useNewsletterSubscriberColumns()
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns])
  const { columnReorder, hasPreferenceOverrides, resetPreferences, table } = useDataGridInstance({
    columns,
    data: [...data.items],
    defaultColumnVisibility: ADMIN_NEWSLETTER_TABLE_DEFAULT_COLUMN_VISIBILITY,
    defaultPageSize: ADMIN_NEWSLETTER_PAGE_SIZE,
    enableRowSelection: false,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: ADMIN_NEWSLETTER_TABLE_COLUMN_PINNING,
    manualPagination: true,
    onPaginationChange: setPagination,
    pageCount: Math.ceil(data.total / pagination.pageSize),
    pagination,
    persistenceKey: newsletterSubscribersDataGrid.persistenceKey,
    rowCount: data.total,
  })

  const { debouncedSearch } = useAdminDebouncedTableSearch(table)
  useEffect(() => {
    setServerSearch(debouncedSearch)
    setPagination((previous) => ({
      ...previous,
      pageIndex: FIRST_PAGE_INDEX,
    }))
  }, [debouncedSearch])

  const applyStatusFilter = useCallback((status: NewsletterStatus | undefined) => {
    setActiveStatus(status)
    setPagination((previous) => ({
      ...previous,
      pageIndex: FIRST_PAGE_INDEX,
    }))
  }, [])

  const showSkeletonRows = isFetching || isPending
  const exportSource = useNewsletterSubscribersExportSource(exportListInput)

  return useMemo(
    () => ({
      activeStatus,
      applyStatusFilter,
      columnReorder,
      exportSource,
      hasPreferenceOverrides,
      isLoading: showSkeletonRows,
      persistenceKey: newsletterSubscribersDataGrid.persistenceKey,
      resetPreferences,
      rowReorder: undefined,
      searchPlaceholder: t("actions.searchPlaceholder"),
      table,
    }),
    [activeStatus, applyStatusFilter, columnReorder, exportSource, hasPreferenceOverrides, resetPreferences, showSkeletonRows, t, table],
  )
}

const isNewsletterSubscribersDataGridValue = (
  value: DataGridContextValue<Newsletter["adminListItem"]>,
): value is NewsletterSubscribersDataGridValue => "applyStatusFilter" in value && typeof value.applyStatusFilter === "function"

export const useNewsletterSubscribersDataGridContext = (): NewsletterSubscribersDataGridValue => {
  const value = newsletterSubscribersDataGrid.useDataGrid()
  if (!isNewsletterSubscribersDataGridValue(value)) {
    throw new Error("useNewsletterSubscribersDataGridContext must be used within the newsletter subscribers table Provider.")
  }

  return value
}

const EMPTY_NEWSLETTER_SUBSCRIBERS_PAGE = {
  hasMore: false,
  items: [] as Newsletter["adminListItem"][],
  limit: ADMIN_NEWSLETTER_PAGE_SIZE,
  offset: 0,
  total: 0,
} as const

export interface NewsletterSubscribersDataGridValue extends DataGridContextValue<Newsletter["adminListItem"]> {
  readonly activeStatus: NewsletterStatus | undefined
  readonly applyStatusFilter: (status: NewsletterStatus | undefined) => void
}

interface UseNewsletterSubscribersDataGridOptions {
  readonly initialStatus: NewsletterStatus | undefined
}
