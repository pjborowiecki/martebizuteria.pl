import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { invalidate } = vi.hoisted(() => ({ invalidate: vi.fn<() => Promise<void>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()

  return { ...actual, useRouter: () => ({ invalidate }) }
})

import { AccountErrorState } from "~/src/presentation/components/custom/pages/account/account-error-state"
import { AccountNotFoundState } from "~/src/presentation/components/custom/pages/account/account-not-found-state"

beforeEach(() => {
  vi.clearAllMocks()
  invalidate.mockResolvedValue()
})

afterEach(cleanup)

describe("AccountErrorState", () => {
  it("explains the failure without blaming the customer", () => {
    renderWithProviders(<AccountErrorState />)

    expect(screen.getByText("We could not load this page")).toBeInTheDocument()
    expect(
      screen.getByText("Something went wrong on our side. Your account and your orders are safe — try again in a moment."),
    ).toBeInTheDocument()
  })

  it("retries the failed page in place", async () => {
    renderWithProviders(<AccountErrorState />)

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(invalidate).toHaveBeenCalledOnce()
  })

  it("offers a way back into the account", () => {
    renderWithProviders(<AccountErrorState />)

    expect(screen.getByRole("link", { name: "Back to your account" })).toHaveAttribute("href", "/account/overview")
  })
})

describe("AccountNotFoundState", () => {
  it("says the page or order does not belong to this account", () => {
    renderWithProviders(<AccountNotFoundState />)

    expect(screen.getByText("We could not find that")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Your orders" })).toHaveAttribute("href", "/account/orders")
  })
})
