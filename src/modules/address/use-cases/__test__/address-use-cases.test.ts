import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ADDRESS_MUTATION_KEYS, ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"

import { createUserAddress } from "../create-user-address"
import { deleteUserAddress, deleteUserAddressMutation } from "../delete-user-address"
import { listUserAddresses, listUserAddressesQuery } from "../list-user-addresses"
import { setDefaultUserAddress, setDefaultUserAddressMutation } from "../set-default-user-address"
import { updateUserAddress } from "../update-user-address"

const USER_ID = "user-1"

const accessors = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  setDefault: vi.fn(),
  update: vi.fn(),
}))

const database = vi.hoisted(() => ({ findMany: vi.fn() }))

const middleware = vi.hoisted(() => {
  const calls: unknown[][] = []

  return { rateLimitCalls: calls }
})

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { limit: 5, windowSeconds: 60 } },
  authorized: () => ({}),
  withRateLimit: (...args: unknown[]) => {
    middleware.rateLimitCalls.push(args)

    return {}
  },
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { query: { address: { findMany: database.findMany } } },
}))
vi.mock("~/src/modules/address/address.accessors", () => ({
  createUserAddress: accessors.create,
  deleteUserAddress: accessors.delete,
  setDefaultUserAddress: accessors.setDefault,
  updateUserAddress: accessors.update,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: { auth: { user: { id: USER_ID } } }, data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            handler({ context: { auth: { user: { id: USER_ID } } }, data: validate(options?.data) }),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const fields = {
  address1: "ul. Srebrna 1",
  city: "Kraków",
  countryCode: "pl",
}

describe("createUserAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.create.mockResolvedValue({ id: "address-1" })
  })

  it("attaches the signed-in user to the address it stores", async () => {
    await createUserAddress({ data: fields })

    expect(accessors.create).toHaveBeenCalledExactlyOnceWith({ ...fields, userId: USER_ID })
  })

  it("keeps the optional fields the caller supplied", async () => {
    await createUserAddress({ data: { ...fields, isDefault: true, phone: "+48123456789", postalCode: "30-001" } })

    expect(accessors.create).toHaveBeenCalledExactlyOnceWith({
      ...fields,
      isDefault: true,
      phone: "+48123456789",
      postalCode: "30-001",
      userId: USER_ID,
    })
  })

  it("rate limits the sensitive address creation endpoint", () => {
    expect(middleware.rateLimitCalls).toContainEqual(["create-user-address", { limit: 5, windowSeconds: 60 }])
  })

  it.each([
    [{ ...fields, address1: "" }],
    [{ ...fields, city: "" }],
    [{ ...fields, countryCode: "POL" }],
    [{ ...fields, countryCode: "" }],
  ])("refuses the incomplete address %j", (data) => {
    expect(() => {
      void createUserAddress({ data })
    }).toThrow()
    expect(accessors.create).not.toHaveBeenCalled()
  })
})

describe("updateUserAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes the update to the signed-in user and renames the id field", async () => {
    accessors.update.mockResolvedValue({ id: "address-1" })

    await updateUserAddress({ data: { ...fields, addressId: "address-1" } })

    expect(accessors.update).toHaveBeenCalledExactlyOnceWith({ ...fields, id: "address-1", userId: USER_ID })
  })

  it("returns the updated row to the caller", async () => {
    const row = { city: "Kraków", id: "address-1" }
    accessors.update.mockResolvedValue(row)

    await expect(updateUserAddress({ data: { ...fields, addressId: "address-1" } })).resolves.toBe(row)
  })

  it("reports a missing address as not found", async () => {
    accessors.update.mockResolvedValue(undefined)

    await expect(updateUserAddress({ data: { ...fields, addressId: "address-9" } })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("refuses an update without an address id", () => {
    expect(() => {
      void updateUserAddress({ data: { ...fields, addressId: "" } })
    }).toThrow()
    expect(accessors.update).not.toHaveBeenCalled()
  })
})

describe("deleteUserAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deletes only within the signed-in user's own addresses", async () => {
    accessors.delete.mockResolvedValue(true)

    await expect(deleteUserAddress({ data: { addressId: "address-1" } })).resolves.toStrictEqual({ ok: true })
    expect(accessors.delete).toHaveBeenCalledExactlyOnceWith(USER_ID, "address-1")
  })

  it("reports an address that does not belong to the user as not found", async () => {
    accessors.delete.mockResolvedValue(false)

    await expect(deleteUserAddress({ data: { addressId: "address-9" } })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("exposes the delete mutation under its own key", () => {
    expect(deleteUserAddressMutation.mutationKey).toStrictEqual(ADDRESS_MUTATION_KEYS.DELETE)
  })
})

describe("setDefaultUserAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("promotes only the signed-in user's own address", async () => {
    accessors.setDefault.mockResolvedValue(true)

    await expect(setDefaultUserAddress({ data: { addressId: "address-1" } })).resolves.toStrictEqual({ ok: true })
    expect(accessors.setDefault).toHaveBeenCalledExactlyOnceWith(USER_ID, "address-1")
  })

  it("reports an unknown address as not found", async () => {
    accessors.setDefault.mockResolvedValue(false)

    await expect(setDefaultUserAddress({ data: { addressId: "address-9" } })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("exposes the default mutation under its own key", () => {
    expect(setDefaultUserAddressMutation.mutationKey).toStrictEqual(ADDRESS_MUTATION_KEYS.SET_DEFAULT)
  })
})

describe("listUserAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns only the rows the database scoped to the signed-in user", async () => {
    const rows = [{ id: "address-1" }]
    database.findMany.mockResolvedValue(rows)

    await expect(listUserAddresses()).resolves.toBe(rows)
    expect(database.findMany).toHaveBeenCalledTimes(1)
  })

  it("caches the list under the shared address query key", () => {
    expect(listUserAddressesQuery().queryKey).toStrictEqual(ADDRESS_QUERY_KEYS.ALL)
  })

  it("reads the saved addresses when the cache runs the query", async () => {
    database.findMany.mockResolvedValue([{ id: "address-1" }])

    await expect(new QueryClient().query(listUserAddressesQuery())).resolves.toStrictEqual([{ id: "address-1" }])
  })
})

it("runs the delete-address mutation with the authenticated owner", async () => {
  accessors.delete.mockResolvedValue(true)
  await expect(
    deleteUserAddressMutation.mutationFn?.({ addressId: "address-1" }, { client: new QueryClient(), meta: undefined }),
  ).resolves.toStrictEqual({ ok: true })
  expect(accessors.delete).toHaveBeenLastCalledWith(USER_ID, "address-1")
})

it("runs the default-address mutation with the authenticated owner", async () => {
  accessors.setDefault.mockResolvedValue(true)
  await expect(
    setDefaultUserAddressMutation.mutationFn?.({ addressId: "address-1" }, { client: new QueryClient(), meta: undefined }),
  ).resolves.toStrictEqual({ ok: true })
  expect(accessors.setDefault).toHaveBeenLastCalledWith(USER_ID, "address-1")
})
