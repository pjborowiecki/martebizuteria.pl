import { type JSX, type ReactNode } from "react"

import { createColumnHelper, useTable } from "@tanstack/react-table"
import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/newsletter/use-cases/get-admin-newsletter-page", () => ({ getAdminNewsletterPageQuery: vi.fn() }))
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-newsletter-subscriber", () => ({ unsubscribeNewsletterSubscriberMutation: {} }))
vi.mock("~/src/modules/newsletter/use-cases/erase-newsletter-subscriber", () => ({ eraseNewsletterSubscriberMutation: {} }))

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { type DataGridFeatures, dataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { buildSubscriber } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/__test__/newsletter-subscriber.fixture"
import { useNewsletterSubscribersDataGridContext } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid"
import { newsletterSubscribersDataGrid } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/utils/newsletter-subscribers-data-grid"

const helper = createColumnHelper<DataGridFeatures, Newsletter["adminListItem"]>()

const COLUMNS = helper.columns([helper.accessor("email", { header: "Email", id: "email" })])

const PlainGridProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const table = useTable<DataGridFeatures, Newsletter["adminListItem"]>({
    columns: COLUMNS,
    data: [buildSubscriber()],
    features: dataGridFeatures,
    getRowId: (row) => row.id,
  })

  return (
    <newsletterSubscribersDataGrid.Provider
      value={{
        columnReorder: { draggedColumnId: undefined, onColumnDragEnd: () => {}, onColumnDragOver: () => {}, onColumnDragStart: () => {} },
        hasPreferenceOverrides: false,
        isLoading: false,
        persistenceKey: newsletterSubscribersDataGrid.persistenceKey,
        resetPreferences: () => {},
        rowReorder: undefined,
        searchPlaceholder: "Search subscribers",
        table,
      }}
    >
      {children}
    </newsletterSubscribersDataGrid.Provider>
  )
}

afterEach(cleanup)

describe("useNewsletterSubscribersDataGridContext", () => {
  it("refuses a grid that does not carry the subscriber status filter", () => {
    expect(() => renderHook(() => useNewsletterSubscribersDataGridContext(), { wrapper: PlainGridProvider })).toThrow(
      "useNewsletterSubscribersDataGridContext must be used within the newsletter subscribers table Provider.",
    )
  })
})
