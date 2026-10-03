import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mocks = vi.hoisted(() => ({
  status: { current: undefined as string | undefined },
  subscribe: vi.fn<(variables: { email: string; source: string }) => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  unsubscribe: vi.fn<() => Promise<unknown>>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/newsletter/use-cases/get-own-newsletter-subscription", async () => {
  const { NEWSLETTER_QUERY_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return {
    getOwnNewsletterSubscriptionQuery: () => ({
      queryFn: () => Promise.resolve({ status: mocks.status.current }),
      queryKey: NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION,
    }),
  }
})
vi.mock("~/src/modules/newsletter/use-cases/subscribe-to-newsletter", async () => {
  const { NEWSLETTER_MUTATION_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return { subscribeToNewsletterMutation: { mutationFn: mocks.subscribe, mutationKey: NEWSLETTER_MUTATION_KEYS.SUBSCRIBE } }
})
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-own-newsletter", async () => {
  const { NEWSLETTER_MUTATION_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return { unsubscribeOwnNewsletterMutation: { mutationFn: mocks.unsubscribe, mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_OWN } }
})

import { NEWSLETTER_SOURCE, NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"

import { NewsletterField } from "~/src/presentation/components/custom/pages/account/profile/newsletter-field"

const ERROR_COPY = "We could not update your subscription. Please try again."

const renderField = (status?: string) => {
  mocks.status.current = status
  renderWithProviders(<NewsletterField email="anna@example.com" />)

  return screen.findByRole("button", { name: status === undefined ? "Subscribe" : "Unsubscribe" })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.current = undefined
  mocks.subscribe.mockResolvedValue({ outcome: "confirmationSent" })
  mocks.unsubscribe.mockResolvedValue({ unsubscribed: true })
})

afterEach(cleanup)

describe("NewsletterField", () => {
  it("signs the customer up with their own address from the account source", async () => {
    await userEvent.click(await renderField())

    await waitFor(() => {
      expect(mocks.subscribe).toHaveBeenCalledOnce()
    })
    expect(mocks.subscribe.mock.calls[0]?.[0]).toStrictEqual({ email: "anna@example.com", source: NEWSLETTER_SOURCE.ACCOUNT })
  })

  it("shows the signup as awaiting confirmation once the status is refreshed", async () => {
    const button = await renderField()
    mocks.status.current = NEWSLETTER_STATUS.PENDING

    await userEvent.click(button)

    expect(await screen.findByText("Awaiting your email confirmation")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeEnabled()
  })

  it("shows the customer as off the list once leaving is refreshed", async () => {
    const button = await renderField(NEWSLETTER_STATUS.CONFIRMED)
    mocks.status.current = undefined

    await userEvent.click(button)

    expect(await screen.findByText("Not Subscribed")).toBeInTheDocument()
    expect(mocks.toastSuccess).toHaveBeenCalledWith("You are no longer subscribed.")
  })

  it("tells the customer when signing up failed and claims nothing", async () => {
    mocks.subscribe.mockRejectedValue(new Error("boom"))

    await userEvent.click(await renderField())

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(ERROR_COPY)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByText("Not Subscribed")).toBeInTheDocument()
  })

  it("tells the customer when leaving the list failed and keeps them subscribed", async () => {
    mocks.unsubscribe.mockRejectedValue(new Error("boom"))

    await userEvent.click(await renderField(NEWSLETTER_STATUS.CONFIRMED))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(ERROR_COPY)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByText("Subscribed")).toBeInTheDocument()
  })

  it("lets a pending signup be withdrawn rather than requested again", async () => {
    await userEvent.click(await renderField(NEWSLETTER_STATUS.PENDING))

    await waitFor(() => {
      expect(mocks.unsubscribe).toHaveBeenCalledOnce()
    })
    expect(mocks.subscribe).not.toHaveBeenCalled()
  })

  it("locks the button while a change is in flight so it cannot be sent twice", async () => {
    mocks.subscribe.mockReturnValue(new Promise(() => {}))
    const button = await renderField()

    await userEvent.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })
})
