import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"
import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useDeleteCustomer } from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-delete-customer"

const { deleteCustomerMutationFn, toastError, toastSuccess, toastWarning } = vi.hoisted(() => ({
  deleteCustomerMutationFn:
    vi.fn<(input: { readonly userId: string }) => Promise<{ goodbyeEmailSent: boolean; ok: true; userId: string }>>(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess, warning: toastWarning } }))
vi.mock("~/src/modules/user/use-cases/delete-customer", () => ({
  deleteCustomerMutation: { mutationFn: deleteCustomerMutationFn, mutationKey: ["users", "delete-customer"] },
}))

vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)

const CUSTOMERS_PAGE_KEY = [...USER_QUERY_KEYS.ADMIN.CUSTOMERS_PAGE, { page: 1 }]

const renderDeleteCustomer = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  queryClient.setQueryData(CUSTOMERS_PAGE_KEY, { rows: [{ id: "usr_1" }] })
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone="UTC">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  )

  return { queryClient, ...renderHook(() => useDeleteCustomer(), { wrapper }) }
}

beforeEach(() => {
  deleteCustomerMutationFn.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
  toastWarning.mockReset()
  StubBroadcastChannel.posted.mockClear()
})

afterEach(() => {
  cleanup()
})

describe("useDeleteCustomer on success", () => {
  it("confirms the deletion and the confirmation email", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: true, ok: true, userId: "usr_1" })
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Account deleted", {
        description: "The account was deleted and a confirmation email was sent.",
      })
    })

    expect(toastError).not.toHaveBeenCalled()
    expect(toastWarning).not.toHaveBeenCalled()
  })

  it("warns the admin when the account is gone but the confirmation email could not be sent", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: false, ok: true, userId: "usr_1" })
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalledWith("Account deleted — email not sent", {
        description: "The confirmation email to the customer could not be sent. The error is recorded in the audit log.",
      })
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })

  it("drops the cached customers list in this tab and leaves the other tabs to the realtime hub", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: true, ok: true, userId: "usr_1" })
    const { queryClient, result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(queryClient.getQueryState(CUSTOMERS_PAGE_KEY)).toBeUndefined()
    })
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
  })

  it("sends the target user id to the server", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: true, ok: true, userId: "usr_9" })
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_9" })

    await waitFor(() => {
      expect(deleteCustomerMutationFn).toHaveBeenCalledTimes(1)
    })

    expect(deleteCustomerMutationFn.mock.calls[0]?.[0]).toStrictEqual({ userId: "usr_9" })
  })
})

describe("useDeleteCustomer on failure", () => {
  it.each([
    [ERROR_CODES.CONFLICT, "You cannot delete your own account from this view."],
    [ERROR_CODES.FORBIDDEN, "Admin accounts cannot be deleted from here."],
    [ERROR_CODES.NOT_FOUND, "This customer was not found. Refresh the table and try again."],
    [ERROR_CODES.INTERNAL_ERROR, "The customer account could not be deleted. Please try again."],
  ])("explains the %s failure to the admin", async (code, description) => {
    deleteCustomerMutationFn.mockRejectedValue(new AppError(code))
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Delete failed", { description })
    })

    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("falls back to the generic message for an error that carries no code", async () => {
    deleteCustomerMutationFn.mockRejectedValue(new Error("network down"))
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Delete failed", {
        description: "The customer account could not be deleted. Please try again.",
      })
    })
  })

  it("still drops the cached customers list, so a stale row cannot linger", async () => {
    deleteCustomerMutationFn.mockRejectedValue(new AppError(ERROR_CODES.NOT_FOUND))
    const { queryClient, result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(queryClient.getQueryState(CUSTOMERS_PAGE_KEY)).toBeUndefined()
    })
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
  })
})
