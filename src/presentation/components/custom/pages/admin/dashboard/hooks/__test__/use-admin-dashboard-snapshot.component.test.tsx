import { type ReactNode, Suspense } from "react"

import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"

const snapshot = vi.hoisted(() => ({
  fetch: vi.fn((input: { locale: string }) => Promise.resolve({ currencyCode: `PLN-${input.locale}` })),
}))

vi.mock("~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot", () => ({
  getDashboardSnapshotQuery: (input: { locale: string }) =>
    queryOptions({ queryFn: () => snapshot.fetch(input), queryKey: ["admin-dashboard", "snapshot", input.locale] as const }),
}))

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Suspense fallback={<span>loading</span>}>{children}</Suspense>
    </QueryClientProvider>
  </IntlProvider>
)

describe("useAdminDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("requests the snapshot for the active locale", async () => {
    const { result } = renderHook(() => useAdminDashboardSnapshot(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    expect(snapshot.fetch).toHaveBeenCalledWith({ locale: TEST_LOCALE })
    expect(result.current.data.currencyCode).toBe(`PLN-${TEST_LOCALE}`)
  })

  it("resolves the snapshot exactly once for a locale", async () => {
    const { result } = renderHook(() => useAdminDashboardSnapshot(), { wrapper })

    await waitFor(() => {
      expect(result.current.data.currencyCode).toBe(`PLN-${TEST_LOCALE}`)
    })
    expect(snapshot.fetch).toHaveBeenCalledTimes(1)
  })
})
