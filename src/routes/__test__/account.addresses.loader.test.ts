import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

interface QueryRequest {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface AddressesRouteDefinition {
  readonly loader?: (
    args: Readonly<{ context: { queryClient: { query: (options: QueryRequest) => Promise<unknown> } } }>,
  ) => Promise<unknown>
}

const captured: { current: AddressesRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: AddressesRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/address/use-cases/create-user-address", () => ({ createUserAddress: vi.fn() }))
vi.mock("~/src/modules/address/use-cases/update-user-address", () => ({ updateUserAddress: vi.fn() }))
vi.mock("~/src/modules/address/use-cases/delete-user-address", () => ({ deleteUserAddressMutation: { mutationFn: vi.fn() } }))
vi.mock("~/src/modules/address/use-cases/set-default-user-address", () => ({ setDefaultUserAddressMutation: { mutationFn: vi.fn() } }))
vi.mock("~/src/modules/address/use-cases/list-user-addresses", () => ({
  listUserAddressesQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: ["userAddresses"] }),
}))

import { ADDRESS_QUERY_KEYS } from "~/src/modules/address/address.constants"

await import("~/src/routes/account.addresses")

const route = captured.current

if (route?.loader === undefined) {
  throw new Error("the addresses route registered no loader")
}

const { loader } = route

describe("the addresses route loader", () => {
  it("warms the saved addresses and treats them as already fresh", async () => {
    const queried: QueryRequest[] = []

    await loader({
      context: {
        queryClient: {
          query: (options: QueryRequest) => {
            queried.push(options)

            return Promise.resolve([])
          },
        },
      },
    })

    expect(queried.map((options) => options.queryKey)).toStrictEqual([ADDRESS_QUERY_KEYS.ALL])
    expect(queried.map((options) => options.staleTime)).toStrictEqual(["static"])
  })
})
