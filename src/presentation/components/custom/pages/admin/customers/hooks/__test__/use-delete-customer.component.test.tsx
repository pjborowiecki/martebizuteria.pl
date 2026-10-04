import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { useDeleteCustomer } from "~/src/presentation/components/custom/pages/admin/customers/hooks/use-delete-customer"

const { deleteCustomerMutationFn, toastError, toastSuccess } = vi.hoisted(() => ({
  deleteCustomerMutationFn:
    vi.fn<(input: { readonly userId: string }) => Promise<{ goodbyeEmailSent: boolean; ok: true; userId: string }>>(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/modules/user/use-cases/delete-customer", () => ({
  deleteCustomerMutation: { mutationFn: deleteCustomerMutationFn, mutationKey: ["users", "delete-customer"] },
}))

const renderDeleteCustomer = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone="UTC">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  )

  return { invalidateQueries, ...renderHook(() => useDeleteCustomer(), { wrapper }) }
}

beforeEach(() => {
  deleteCustomerMutationFn.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
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
  })

  it("tells the admin when the account is gone but the confirmation email could not be sent", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: false, ok: true, userId: "usr_1" })
    const { result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Account deleted", {
        description: "The account was deleted, but the confirmation email could not be sent. The failure is recorded in the audit log.",
      })
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it("refreshes the customers list", async () => {
    deleteCustomerMutationFn.mockResolvedValue({ goodbyeEmailSent: true, ok: true, userId: "usr_1" })
    const { invalidateQueries, result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS, refetchType: "all" })
    })
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

  it("still refreshes the customers list, so a stale row cannot linger", async () => {
    deleteCustomerMutationFn.mockRejectedValue(new AppError(ERROR_CODES.NOT_FOUND))
    const { invalidateQueries, result } = renderDeleteCustomer()

    result.current.mutate({ userId: "usr_1" })

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: USER_QUERY_KEYS.ADMIN.CUSTOMERS, refetchType: "all" })
    })
  })
})
