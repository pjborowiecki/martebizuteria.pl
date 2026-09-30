import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

const { auth, background, getRequestHeaders, getUserById, sendAccountDeletedEmail, serverContext } = vi.hoisted(() => ({
  auth: { api: { removeUser: vi.fn<(input: object) => Promise<{ success: boolean }>>() } },
  background: vi.fn<(work: unknown) => void>(),
  getRequestHeaders: vi.fn<() => Record<string, string>>(),
  getUserById: vi.fn<(id: string) => Promise<{ email: string; id: string; name: string; role: string | null } | undefined>>(),
  sendAccountDeletedEmail: vi.fn<(input: object) => Promise<void>>(),
  serverContext: { auth: { user: { id: "admin-1" } } },
}))

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler:
        (handler: (options: { readonly context: unknown; readonly data: unknown }) => unknown) => (options: { readonly data: unknown }) =>
          Promise.resolve(options).then((received) =>
            handler({ context: serverContext, data: state.validator === undefined ? received.data : state.validator(received.data) }),
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
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeaders }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth, sendAccountDeletedEmail }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/user/user.accessors", () => ({ getUserById }))
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork: background }))

import { deleteCustomer, deleteCustomerMutation } from "~/src/modules/user/use-cases/delete-customer"

const customer = { email: "anna@example.com", id: "user-1", name: "Anna Kowalska", role: "customer" }

beforeEach(() => {
  vi.clearAllMocks()
  serverContext.auth.user.id = "admin-1"
  getUserById.mockResolvedValue(customer)
  getRequestHeaders.mockReturnValue({ cookie: "session=abc" })
  auth.api.removeUser.mockResolvedValue({ success: true })
  sendAccountDeletedEmail.mockResolvedValue(undefined)
})

describe("deleteCustomer", () => {
  it("rejects a customer id that is empty", async () => {
    await expect(deleteCustomer({ data: { userId: "" } })).rejects.toThrow()

    expect(getUserById).not.toHaveBeenCalled()
  })

  it("reports an unknown customer as not found", async () => {
    getUserById.mockResolvedValue(undefined)

    await expect(deleteCustomer({ data: { userId: "ghost" } })).rejects.toThrow("USER_NOT_FOUND")

    expect(auth.api.removeUser).not.toHaveBeenCalled()
  })

  it("refuses to delete the signed-in administrator's own account", async () => {
    serverContext.auth.user.id = "user-1"

    await expect(deleteCustomer({ data: { userId: "user-1" } })).rejects.toThrow("CANNOT_DELETE_SELF")

    expect(auth.api.removeUser).not.toHaveBeenCalled()
  })

  it("refuses to delete another administrator", async () => {
    getUserById.mockResolvedValue({ ...customer, id: "user-2", role: "admin" })

    await expect(deleteCustomer({ data: { userId: "user-2" } })).rejects.toThrow("CANNOT_DELETE_ADMIN")

    expect(auth.api.removeUser).not.toHaveBeenCalled()
  })

  it("removes the customer through the auth server with the incoming request headers", async () => {
    await deleteCustomer({ data: { userId: "user-1" } })

    expect(auth.api.removeUser).toHaveBeenCalledWith({ body: { userId: "user-1" }, headers: { cookie: "session=abc" } })
  })

  it("confirms the deletion of the customer it was given", async () => {
    await expect(deleteCustomer({ data: { userId: "user-1" } })).resolves.toStrictEqual({ ok: true, userId: "user-1" })
  })

  it("sends the goodbye email in the background, using the details captured before the removal", async () => {
    await deleteCustomer({ data: { userId: "user-1" } })

    expect(sendAccountDeletedEmail).toHaveBeenCalledWith({ email: "anna@example.com", locale: "pl-PL", name: "Anna Kowalska" })
    expect(background).toHaveBeenCalledOnce()
  })

  it("sends no goodbye email when the removal fails", async () => {
    auth.api.removeUser.mockRejectedValue(new Error("session expired"))

    await expect(deleteCustomer({ data: { userId: "user-1" } })).rejects.toThrow("session expired")

    expect(background).not.toHaveBeenCalled()
  })

  it("keeps a customer without a role deletable", async () => {
    getUserById.mockResolvedValue({ ...customer, role: null })

    await expect(deleteCustomer({ data: { userId: "user-1" } })).resolves.toStrictEqual({ ok: true, userId: "user-1" })
  })
})

describe("deleteCustomerMutation", () => {
  it("is keyed for the customer deletion", () => {
    expect(deleteCustomerMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.DELETE_CUSTOMER)
  })

  it("forwards its input to the server function", async () => {
    await deleteCustomerMutation.mutationFn?.({ userId: "user-1" }, { client: new QueryClient(), meta: undefined })

    expect(auth.api.removeUser).toHaveBeenCalledWith({ body: { userId: "user-1" }, headers: { cookie: "session=abc" } })
  })
})
