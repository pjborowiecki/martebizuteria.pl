import { type JSX } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

interface PrefetchedQuery {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly loader?: (args: {
    readonly context: { readonly queryClient: { readonly query: (options: PrefetchedQuery) => Promise<unknown> } }
  }) => Promise<void>
  readonly shouldReload?: boolean
  readonly staleTime?: number
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})

const spies = vi.hoisted(() => ({
  listQuery: vi.fn((input: unknown) => ({ queryKey: ["audit", "list", input] })),
  statsQuery: vi.fn((today: string) => ({ queryKey: ["audit", "stats", today] })),
}))

vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  displayPreferencesQuery: {
    queryFn: () =>
      Promise.resolve({
        detected: { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" },
        saved: { formatLocale: undefined, timeZone: undefined },
      }),
    queryKey: ["i18n", "displayPreferences"],
    staleTime: Number.POSITIVE_INFINITY,
  },
}))
vi.mock("~/src/modules/audit-log/use-cases/get-audit-log-stats", () => ({ getAuditLogStatsQuery: spies.statsQuery }))
vi.mock("~/src/modules/audit-log/use-cases/list-audit-logs", () => ({ listAuditLogsQuery: spies.listQuery }))
vi.mock("~/src/presentation/components/custom/pages/admin/audit/components/audit-table-content", () => ({
  AuditTableContent: (): JSX.Element => <p>audit log table</p>,
}))

import { ADMIN_AUDIT_LOG_PAGE_SIZE, AUDIT_LOG_QUERY_STALE_MS } from "~/src/modules/audit-log/audit-log.constants"

await import("~/src/routes/admin.audit")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin audit route did not register any options")
}

const renderAuditPage = () => {
  const AuditPage = route.component
  if (AuditPage === undefined) {
    throw new Error("the admin audit route renders no component")
  }

  return renderWithProviders(
    <SidebarProvider>
      <AuditPage />
    </SidebarProvider>,
  )
}

const runLoader = async (timeZone = "Europe/Warsaw"): Promise<{ queried: PrefetchedQuery[] }> => {
  const queried: PrefetchedQuery[] = []
  await route.loader?.({
    context: {
      queryClient: {
        query: (options: PrefetchedQuery) => {
          if (options.queryKey[1] === "displayPreferences") {
            return Promise.resolve({
              detected: { formatLocale: "pl-PL", timeZone },
              saved: { formatLocale: undefined, timeZone: undefined },
            })
          }

          queried.push(options)

          return Promise.resolve(undefined)
        },
      },
    },
  })

  return { queried }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("admin audit page", () => {
  it("titles and explains the audit log", () => {
    renderAuditPage()

    expect(screen.getByRole("heading", { level: 1, name: "Audit Log" })).toBeInTheDocument()
    expect(screen.getByText("Track all system events and administrative actions.")).toBeInTheDocument()
  })

  it("renders the audit log table under the header", () => {
    renderAuditPage()

    expect(screen.getByText("audit log table")).toBeInTheDocument()
  })
})

describe("admin audit route loader", () => {
  it("prefetches the statistics and the first page of the log", async () => {
    const { queried } = await runLoader()

    expect(spies.statsQuery).toHaveBeenCalledOnce()
    expect(spies.listQuery).toHaveBeenCalledWith({ page: 1, pageSize: ADMIN_AUDIT_LOG_PAGE_SIZE })
    expect(queried).toHaveLength(2)
  })

  it("prefetches the statistics for the day it is in Poland, though it is still the day before in UTC", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T22:30:00.000Z"), toFake: ["Date"] })

    try {
      await runLoader()
    } finally {
      vi.useRealTimers()
    }

    expect(spies.statsQuery).toHaveBeenCalledWith("2026-10-15")
  })

  it("prefetches the statistics for the viewer's own day", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-14T22:30:00.000Z"), toFake: ["Date"] })

    try {
      await runLoader("America/New_York")
    } finally {
      vi.useRealTimers()
    }

    expect(spies.statsQuery).toHaveBeenCalledWith("2026-10-14")
  })

  it("treats the prefetched pages as already fresh", async () => {
    const { queried } = await runLoader()

    expect(queried.map((options) => options.staleTime)).toStrictEqual(["static", "static"])
  })
})

describe("admin audit route wiring", () => {
  it("keeps the prefetched log for as long as the audit queries stay fresh", () => {
    expect(route.staleTime).toBe(AUDIT_LOG_QUERY_STALE_MS)
    expect(route.shouldReload).toBe(false)
  })
})
