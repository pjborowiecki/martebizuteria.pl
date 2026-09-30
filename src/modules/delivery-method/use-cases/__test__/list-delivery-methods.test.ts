import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"

import { listDeliveryMethods, listDeliveryMethodsQuery } from "../list-delivery-methods"

interface JoinedRow {
  readonly courier: { id: string; name: string }
  readonly deliveryMethod: { courierId: string; id: string; title: string }
}

const query = vi.hoisted(() => {
  const rows: { current: readonly unknown[] } = { current: [] }
  const where = vi.fn(() => Promise.resolve(rows.current))
  const innerJoin = vi.fn(() => ({ where }))
  const from = vi.fn(() => ({ innerJoin }))
  const select = vi.fn(() => ({ from }))

  return { from, innerJoin, rows, select, where }
})

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { select: query.select } }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => () => handler(),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const joinedRow = (id: string): JoinedRow => ({
  courier: { id: `courier-${id}`, name: `Courier ${id}` },
  deliveryMethod: { courierId: `courier-${id}`, id, title: `Method ${id}` },
})

describe("listDeliveryMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.rows.current = []
  })

  it("flattens the joined courier onto each delivery method", async () => {
    query.rows.current = [joinedRow("standard"), joinedRow("express")]

    const methods = await listDeliveryMethods()

    expect(methods).toStrictEqual([
      {
        courier: { id: "courier-standard", name: "Courier standard" },
        courierId: "courier-standard",
        id: "standard",
        title: "Method standard",
      },
      { courier: { id: "courier-express", name: "Courier express" }, courierId: "courier-express", id: "express", title: "Method express" },
    ])
  })

  it("filters on the active method joined to an active courier", async () => {
    await listDeliveryMethods()

    expect(query.select).toHaveBeenCalledTimes(1)
    expect(query.innerJoin).toHaveBeenCalledTimes(1)
    expect(query.where).toHaveBeenCalledTimes(1)
  })

  it("returns an empty list when nothing is active", async () => {
    await expect(listDeliveryMethods()).resolves.toStrictEqual([])
  })

  it("keys the query by the shared delivery method namespace", () => {
    expect(listDeliveryMethodsQuery().queryKey).toStrictEqual(DELIVERY_METHOD_QUERY_KEYS.ALL)
  })

  it("reads the active methods through the server function when fetched", async () => {
    query.rows.current = [joinedRow("standard")]

    await expect(new QueryClient().query(listDeliveryMethodsQuery())).resolves.toStrictEqual([
      {
        courier: { id: "courier-standard", name: "Courier standard" },
        courierId: "courier-standard",
        id: "standard",
        title: "Method standard",
      },
    ])
  })
})
