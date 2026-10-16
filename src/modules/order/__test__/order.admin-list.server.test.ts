import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

const accessors = vi.hoisted(() => ({
  getAdminOrderDestinationRows: vi.fn<(ids: readonly string[]) => Promise<unknown[]>>(),
  getAdminOrderItemCountRows: vi.fn<(ids: readonly string[]) => Promise<{ itemCount: number; orderId: string }[]>>(),
}))

vi.mock("~/src/modules/order/order.accessors", () => accessors)

import { loadAdminOrderListItems } from "~/src/modules/order/order.admin-list.server"

const CREATED_AT = new Date(1_700_000_000_000)

const sourceRow = (
  overrides: Partial<
    Omit<Parameters<typeof toAdminOrderListItem>[0], "itemCount"> & { billingCompanyName: string | null; billingNip: string | null }
  > = {},
) => ({
  billingCompanyName: null,
  billingNip: null,
  createdAt: CREATED_AT,
  currencyCode: "PLN",
  customerName: "Ada Lovelace",
  deliveredEmailAt: null,
  email: "ada@example.test",
  fulfillmentStatus: "shipped" as const,
  id: "order-1",
  inProgressEmailAt: CREATED_AT,
  metadata: null,
  orderNumber: "MRT-2026-00001",
  paymentStatus: "succeeded" as const,
  shippedEmailAt: CREATED_AT,
  status: "processing" as const,
  total: 19_900,
  userId: "user-1",
  ...overrides,
})

const LOCKER_DESTINATION = {
  addresses: [],
  checkout: null,
  deliveryMethod: { names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }, type: "locker" },
  id: "order-1",
  lockerId: "WAW01M",
  lockerPoint: JSON.stringify({ city: "Warszawa", postalCode: "00-001", street: "Marszałkowska" }),
}

beforeEach(() => {
  vi.clearAllMocks()
  accessors.getAdminOrderDestinationRows.mockResolvedValue([])
  accessors.getAdminOrderItemCountRows.mockResolvedValue([{ itemCount: 3, orderId: "order-1" }])
})

describe("loadAdminOrderListItems", () => {
  it("adds the company, the NIP and the destination the order's hidden columns show", async () => {
    accessors.getAdminOrderDestinationRows.mockResolvedValue([LOCKER_DESTINATION])

    const [item] = await loadAdminOrderListItems(
      [sourceRow({ billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246" })],
      "pl-PL",
    )

    expect(accessors.getAdminOrderDestinationRows).toHaveBeenCalledExactlyOnceWith(["order-1"])
    expect(item).toMatchObject({
      billingCompanyName: "Pracownia Złotnicza sp. z o.o.",
      billingNip: "5260001246",
      destination: "Paczkomat InPost: WAW01M, Marszałkowska, 00-001 Warszawa",
      id: "order-1",
      paymentUiKey: "paid",
    })
  })

  it("names the delivery method in the language it is asked for", async () => {
    accessors.getAdminOrderDestinationRows.mockResolvedValue([LOCKER_DESTINATION])

    const [item] = await loadAdminOrderListItems([sourceRow()], "en-US")

    expect(item?.destination).toBe("InPost parcel locker: WAW01M, Marszałkowska, 00-001 Warszawa")
  })

  it("leaves the company, the NIP and the destination empty for an order without them", async () => {
    const [item] = await loadAdminOrderListItems([sourceRow()], "pl-PL")

    expect(item?.billingCompanyName).toBeUndefined()
    expect(item?.billingNip).toBeUndefined()
    expect(item?.destination).toBeUndefined()
  })

  it("keeps the order of the rows it was given", async () => {
    const items = await loadAdminOrderListItems([sourceRow({ id: "order-2" }), sourceRow()], "pl-PL")

    expect(items.map(({ id }) => id)).toStrictEqual(["order-2", "order-1"])
  })

  it("counts the items of each order, and none for an order without lines", async () => {
    const items = await loadAdminOrderListItems([sourceRow({ id: "order-2" }), sourceRow()], "pl-PL")

    expect(accessors.getAdminOrderItemCountRows).toHaveBeenCalledExactlyOnceWith(["order-2", "order-1"])
    expect(items.map(({ id, itemCount }) => ({ id, itemCount }))).toStrictEqual([
      { id: "order-2", itemCount: 0 },
      { id: "order-1", itemCount: 3 },
    ])
  })

  it("reads the item counts and the destinations at the same time", async () => {
    const itemCounts = Promise.withResolvers<{ itemCount: number; orderId: string }[]>()
    accessors.getAdminOrderItemCountRows.mockReturnValue(itemCounts.promise)
    const items = loadAdminOrderListItems([sourceRow()], "pl-PL")

    expect(accessors.getAdminOrderDestinationRows).toHaveBeenCalledExactlyOnceWith(["order-1"])
    itemCounts.resolve([])

    await expect(items).resolves.toHaveLength(1)
  })

  it("reads nothing for an empty page", async () => {
    await expect(loadAdminOrderListItems([], "pl-PL")).resolves.toStrictEqual([])
    expect(accessors.getAdminOrderItemCountRows).not.toHaveBeenCalled()
    expect(accessors.getAdminOrderDestinationRows).not.toHaveBeenCalled()
  })
})
