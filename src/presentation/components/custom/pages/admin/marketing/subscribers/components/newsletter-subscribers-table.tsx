import { type JSX, useMemo } from "react"

import { type NewsletterStatus } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

import { DataGridShell } from "~/src/presentation/components/custom/datagrid/components/data-grid-shell"
import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { NewsletterSubscribersStatusFilter } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-filters"
import { NewsletterSubscribersRefreshAction } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-refresh-action"
import { NewsletterSubscribersStats } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-stats"
import { useNewsletterSubscribersDataGrid } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid"
import { newsletterSubscribersDataGrid } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/utils/newsletter-subscribers-data-grid"

export const NewsletterSubscribersTableContent = ({
  initialStatus,
}: Readonly<{ initialStatus: NewsletterStatus | undefined }>): JSX.Element => {
  const grid = useNewsletterSubscribersDataGrid({ initialStatus })
  const toolbarFilters = useMemo(() => <NewsletterSubscribersStatusFilter />, [])

  return (
    <Provider value={grid}>
      <div className={ADMIN_CATALOG_DATAGRID_PAGE_CLASS}>
        <NewsletterSubscribersStats />
        <DataGridShell>
          <Toolbar filters={toolbarFilters}>
            <NewsletterSubscribersRefreshAction />
            <Export />
          </Toolbar>
          <Body />
          <Pagination />
        </DataGridShell>
      </div>
    </Provider>
  )
}

const { Body, Export, Pagination, Provider, Toolbar } = newsletterSubscribersDataGrid
