import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { type toAdminOrderListItem } from "~/src/modules/order/order.utils"

import { exportAdminOrders } from "../export-admin-orders"
import { getAdminOrderStats, getAdminOrderStatsQuery } from "../get-admin-order-stats"
import { getAdminOrdersPage, getAdminOrdersPageQuery } from "../get-admin-orders-page"

type SourceRow = Omit<Parameters<typeof toAdminOrderListItem>[0], "itemCount"> & {
  readonly billingCompanyName: string | null
  readonly billingNip: string | null
}

const CREATED_AT = new Date(1_700_000_000_000)

const sourceRow = (overrides: Partial<SourceRow> = {}): SourceRow => ({
  billingCompanyName: null,
  billingNip: null,
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerName: "Ada Lovelace",
  deliveredEmailAt: null,
  email: "ada@example.test",
  fulfillmentStatus: "shipped",
  id: "order-1",
  inProgressEmailAt: CREATED_AT,
  metadata: null,
  orderNumber: "MRT-2026-00001",
  paymentStatus: "succeeded",
  shippedEmailAt: CREATED_AT,
  status: "processing",
  total: 19_900,
  userId: "user-1",
  ...overrides,
})

const accessors = vi.hoisted(() => {
  const pageParams: unknown[] = []
  const exportParams: unknown[] = []

  return {
    destinationRows: [] as unknown[],
    exportParams,
    getAdminOrderDestinationRows: vi.fn(() => Promise.resolve(accessors.destinationRows)),
    getAdminOrderItemCountRows: vi.fn(() => Promise.resolve(accessors.itemCountRows)),
    getAdminOrderStats: vi.fn(() => Promise.resolve({ pending: 2, total: 9 })),
    getAdminOrdersExport: vi.fn((params: unknown) => {
      exportParams.push(params)

      return Promise.resolve(accessors.rows)
    }),
    getAdminOrdersPage: vi.fn((params: unknown) => {
      pageParams.push(params)

      return Promise.resolve({ rows: accessors.rows, total: accessors.total })
    }),
    itemCountRows: [] as unknown[],
    pageParams,
    recordListExportedAudit: vi.fn(),
    rows: [] as unknown[],
    total: 0,
  }
})

vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => import("~/src/platform/testing/mocks/display-preferences"))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getAdminOrderDestinationRows: accessors.getAdminOrderDestinationRows,
  getAdminOrderItemCountRows: accessors.getAdminOrderItemCountRows,
  getAdminOrderStats: accessors.getAdminOrderStats,
  getAdminOrdersExport: accessors.getAdminOrdersExport,
  getAdminOrdersPage: accessors.getAdminOrdersPage,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-list-export-audit.server", () => ({
  recordListExportedAudit: accessors.recordListExportedAudit,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  accessors.pageParams.length = 0
  accessors.exportParams.length = 0
  accessors.rows = [sourceRow()]
  accessors.itemCountRows = [{ itemCount: 3, orderId: "order-1" }]
  accessors.total = 1
})

describe("getAdminOrdersPage parameters", () => {
  it("defaults to the first page and the shared page size", async () => {
    await getAdminOrdersPage({ data: {} })

    expect(accessors.pageParams[0]).toMatchObject({ limit: 25, offset: 0 })
  })

  it("turns a page number into an offset", async () => {
    await getAdminOrdersPage({ data: { page: 3, pageSize: 10 } })

    expect(accessors.pageParams[0]).toMatchObject({ limit: 10, offset: 20 })
  })

  it("passes every column filter through untouched", async () => {
    await getAdminOrdersPage({
      data: { fulfillment: "shipped", payment: "paid", statFilter: "pending", status: "processing", tab: "unfulfilled" },
    })

    expect(accessors.pageParams[0]).toMatchObject({
      filters: { createdAt: undefined, fulfillment: "shipped", payment: "paid", status: "processing", total: undefined },
      statFilter: "pending",
      tab: "unfulfilled",
    })
  })

  it("scopes the page to the customer it was asked for", async () => {
    await getAdminOrdersPage({ data: { userId: "u-anna" } })

    expect(accessors.pageParams[0]).toMatchObject({ userId: "u-anna" })
  })

  it("trims the search term", async () => {
    await getAdminOrdersPage({ data: { search: "  ada  " } })

    expect(accessors.pageParams[0]).toMatchObject({ search: "ada" })
  })

  it("drops a blank search term", async () => {
    await getAdminOrdersPage({ data: { search: "   " } })

    expect(accessors.pageParams[0]).toMatchObject({ search: undefined })
  })
})

describe("getAdminOrdersPage result", () => {
  it("maps each row into an admin list item", async () => {
    const { items } = await getAdminOrdersPage({ data: {} })

    expect(items).toStrictEqual([
      {
        billingCompanyName: undefined,
        billingNip: undefined,
        createdAt: CREATED_AT,
        currencyCode: "PLN",
        customerName: "Ada Lovelace",
        destination: undefined,
        email: "ada@example.test",
        emailedSteps: ["processing", "shipped"],
        fulfillmentStatus: "shipped",
        fulfillmentUiKey: "shipped",
        hasOpenDispute: false,
        id: "order-1",
        initials: "AL",
        itemCount: 3,
        orderNumber: "MRT-2026-00001",
        paymentUiKey: "paid",
        status: "processing",
        totalMinorUnits: 19_900,
        userId: "user-1",
      },
    ])
  })

  it("flags an order whose dispute is still open", async () => {
    accessors.rows = [
      sourceRow({ metadata: JSON.stringify({ dispute: { amount: 19_900, id: "dp_1", reason: "fraudulent", status: "needs_response" } }) }),
    ]

    const { items } = await getAdminOrdersPage({ data: {} })

    expect(items[0]?.hasOpenDispute).toBe(true)
  })

  it("falls back to the email when the customer has no name, and to no items when the order has no lines", async () => {
    accessors.rows = [sourceRow({ customerName: null })]
    accessors.itemCountRows = []

    const { items } = await getAdminOrdersPage({ data: {} })

    expect(items[0]).toMatchObject({ customerName: "ada@example.test", itemCount: 0 })
  })

  it("reports more pages when the total exceeds the page", async () => {
    accessors.total = 9

    await expect(getAdminOrdersPage({ data: {} })).resolves.toMatchObject({ hasMore: true, limit: 25, offset: 0, total: 9 })
  })

  it("reports no more pages once the offset plus the page covers the total", async () => {
    accessors.total = 1

    await expect(getAdminOrdersPage({ data: {} })).resolves.toMatchObject({ hasMore: false })
  })

  it("keys the page query by the filters it was given", () => {
    const input = { tab: "pending" } as const

    expect(getAdminOrdersPageQuery(input).queryKey).toStrictEqual([...ORDER_QUERY_KEYS.ADMIN.PAGE, input])
  })
})

describe("exportAdminOrders", () => {
  it("asks for every matching row without pagination", async () => {
    await exportAdminOrders({ data: { tab: "delivered" } })

    expect(accessors.exportParams[0]).toStrictEqual({
      filters: { createdAt: undefined, fulfillment: undefined, payment: undefined, status: undefined, total: undefined },
      search: undefined,
      statFilter: undefined,
      tab: "delivered",
      timeZone: "Europe/Warsaw",
      userId: undefined,
    })
  })

  it("scopes the export to the customer it was asked for, and records the export in the audit log", async () => {
    await exportAdminOrders({ data: { userId: "u-anna" } })

    expect(accessors.exportParams[0]).toMatchObject({ userId: "u-anna" })
    expect(accessors.recordListExportedAudit).toHaveBeenCalledExactlyOnceWith("orders", 1, { metadata: { filters: { userId: "u-anna" } } })
  })

  it("returns the mapped list items rather than the raw rows", async () => {
    const items = await exportAdminOrders({ data: {} })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: "order-1", paymentUiKey: "paid" })
  })

  it("marks a pending order as pending regardless of its fulfillment status", async () => {
    accessors.rows = [sourceRow({ fulfillmentStatus: "fulfilled", status: "pending" })]

    const items = await exportAdminOrders({ data: {} })

    expect(items[0]).toMatchObject({ fulfillmentUiKey: "pending" })
  })

  it("adds the company and NIP a business buyer gave", async () => {
    accessors.rows = [sourceRow({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })]

    const items = await exportAdminOrders({ data: {} })

    expect(items[0]).toMatchObject({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246", id: "order-1" })
  })

  it("leaves the company and NIP out of an order placed without them", async () => {
    const items = await exportAdminOrders({ data: {} })

    expect(items[0]?.billingCompanyName).toBeUndefined()
    expect(items[0]?.destination).toBeUndefined()
    expect(items[0]?.billingNip).toBeUndefined()
  })

  it("names where each exported order goes, the parcel locker of a locker order", async () => {
    accessors.destinationRows = [
      {
        addresses: [],
        checkout: null,
        deliveryMethod: { names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }, type: "locker" },
        id: "order-1",
        lockerId: "WAW01M",
        lockerPoint: JSON.stringify({ city: "Warszawa", postalCode: "00-001", street: "Marszałkowska" }),
      },
    ]

    const items = await exportAdminOrders({ data: {} })

    expect(accessors.getAdminOrderDestinationRows).toHaveBeenCalledWith(["order-1"])
    expect(items[0]?.destination).toBe("InPost parcel locker: WAW01M, Marszałkowska, 00-001 Warszawa")
    accessors.destinationRows = []
  })
})

describe("getAdminOrderStats", () => {
  it("returns the counts the accessor reports", async () => {
    await expect(getAdminOrderStats()).resolves.toStrictEqual({ pending: 2, total: 9 })
  })

  it("keys the stats query by the shared admin stats key", () => {
    expect(getAdminOrderStatsQuery().queryKey).toStrictEqual(ORDER_QUERY_KEYS.ADMIN.STATS)
  })

  it("keeps the cached stats out of a refetch on mount or focus", () => {
    const options = getAdminOrderStatsQuery()

    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches the stats through the server function", async () => {
    await expect(new QueryClient().query(getAdminOrderStatsQuery())).resolves.toStrictEqual({ pending: 2, total: 9 })
  })
})

it("loads the requested order page through its cache query", async () => {
  await expect(new QueryClient().query(getAdminOrdersPageQuery({ page: 2, pageSize: 10 }))).resolves.toMatchObject({ total: 1 })
  expect(accessors.pageParams[0]).toMatchObject({ limit: 10, offset: 10 })
})
