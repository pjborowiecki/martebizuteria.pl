import { QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

const database = vi.hoisted(() => ({
  update: vi.fn<(values: Record<string, unknown>, condition: unknown) => void>(),
}))

const access = vi.hoisted(() => ({
  defaultAddress: vi.fn<(userId: string) => Promise<{ readonly countryCode: string } | undefined>>(),
  upsertAddress: vi.fn<(input: Record<string, unknown>) => Promise<void>>(),
  userById: vi.fn<(id: string) => Promise<{ readonly id: string } | undefined>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (condition: unknown) => {
          database.update(values, condition)
        },
      }),
    }),
  },
}))

vi.mock("~/src/modules/user/user.accessors", () => ({ getUserById: access.userById }))

vi.mock("~/src/modules/address/address.accessors", () => ({
  getDefaultAddressForUser: access.defaultAddress,
  upsertDefaultAddressForUser: access.upsertAddress,
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { readonly data: unknown }) => unknown) => (options: { readonly data: unknown }) =>
        Promise.resolve(options).then((received) =>
          handler({ data: state.validator === undefined ? received.data : state.validator(received.data) }),
        ),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { updateCustomer, updateCustomerMutation } from "~/src/modules/user/use-cases/update-customer"

const ADDRESS = {
  address1: "  Kwiatowa 3  ",
  address2: "  flat 2  ",
  city: "  Krakow  ",
  countryCode: "pl",
  postalCode: "  30-001  ",
  province: "  Malopolskie  ",
}

const setValues = () => {
  const values = database.update.mock.calls[0]?.[0]
  if (values === undefined) {
    throw new Error("expected the customer row to be updated")
  }

  return values
}

beforeEach(() => {
  vi.resetAllMocks()
  access.userById.mockResolvedValue({ id: "user-1" })
})

describe("updateCustomer", () => {
  it("rejects an unknown customer before touching the database", async () => {
    access.userById.mockResolvedValue(undefined)

    await expect(updateCustomer({ data: { id: "user-1", values: { customTags: [] } } })).rejects.toThrow("USER_NOT_FOUND")

    expect(database.update).not.toHaveBeenCalled()
  })

  it("confirms the update of a known customer", async () => {
    await expect(updateCustomer({ data: { id: "user-1", values: { customTags: [] } } })).resolves.toStrictEqual({ ok: true })
  })

  it("stores the notes and tags as serialized metadata", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [" vip ", ""], notes: " Prefers silver " } } })

    expect(setValues()["metadata"]).toBe(JSON.stringify({ notes: "Prefers silver", tags: ["vip"] }))
  })

  it("stores the trimmed phone number", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [], phone: "  +48 600 100 200  " } } })

    expect(setValues()["phone"]).toBe("+48 600 100 200")
  })

  it("clears the metadata and the phone when nothing is left to store", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [], notes: "   ", phone: "   " } } })

    expect(setValues()["metadata"]).toBeInstanceOf(SQL)
    expect(setValues()["phone"]).toBeInstanceOf(SQL)
  })

  it("clears the phone when the form omits it", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [] } } })

    expect(setValues()["phone"]).toBeInstanceOf(SQL)
  })

  it("scopes the update to the requested customer", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [] } } })

    expect(database.update.mock.calls[0]?.[1]).toBeInstanceOf(SQL)
  })

  it("leaves the address alone when the form carries none", async () => {
    await updateCustomer({ data: { id: "user-1", values: { customTags: [] } } })

    expect(access.upsertAddress).not.toHaveBeenCalled()
  })

  it("leaves the address alone when the street or the city is blank", async () => {
    await updateCustomer({ data: { id: "user-1", values: { address: { ...ADDRESS, address1: "   " }, customTags: [] } } })
    await updateCustomer({ data: { id: "user-1", values: { address: { ...ADDRESS, city: "  " }, customTags: [] } } })

    expect(access.upsertAddress).not.toHaveBeenCalled()
  })

  it("upserts the trimmed address with an uppercase country code", async () => {
    await updateCustomer({ data: { id: "user-1", values: { address: ADDRESS, customTags: [] } } })

    expect(access.upsertAddress).toHaveBeenCalledWith({
      address1: "Kwiatowa 3",
      address2: "flat 2",
      city: "Krakow",
      countryCode: "PL",
      postalCode: "30-001",
      province: "Malopolskie",
      userId: "user-1",
    })
  })

  it("keeps the stored country code when the form leaves it empty", async () => {
    access.defaultAddress.mockResolvedValue({ countryCode: "DE" })

    await updateCustomer({ data: { id: "user-1", values: { address: { ...ADDRESS, countryCode: "" }, customTags: [] } } })

    expect(access.defaultAddress).toHaveBeenCalledWith("user-1")
    expect(access.upsertAddress.mock.calls[0]?.[0]).toMatchObject({ countryCode: "DE" })
  })

  it("skips the address when no country code can be resolved at all", async () => {
    access.defaultAddress.mockResolvedValue(undefined)

    await expect(
      updateCustomer({ data: { id: "user-1", values: { address: { ...ADDRESS, countryCode: "" }, customTags: [] } } }),
    ).resolves.toStrictEqual({ ok: true })

    expect(access.upsertAddress).not.toHaveBeenCalled()
  })

  it("rejects a customer id that is empty", async () => {
    await expect(updateCustomer({ data: { id: "", values: { customTags: [] } } })).rejects.toThrow()
  })
})

describe("updateCustomerMutation", () => {
  it("is keyed for the customer update", () => {
    expect(updateCustomerMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.UPDATE_CUSTOMER)
  })

  it("forwards its input to the server function", async () => {
    await updateCustomerMutation.mutationFn?.(
      { id: "user-1", values: { customTags: ["vip"] } },
      { client: new QueryClient(), meta: undefined },
    )

    expect(setValues()["metadata"]).toBe(JSON.stringify({ tags: ["vip"] }))
  })
})
