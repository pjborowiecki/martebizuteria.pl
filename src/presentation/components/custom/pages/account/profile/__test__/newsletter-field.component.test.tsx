import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import englishAccount from "~/messages/en-US/pages.account.json"
import polishAccount from "~/messages/pl-PL/pages.account.json"

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

import { NEWSLETTER_QUERY_KEYS, NEWSLETTER_SOURCE, NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"

import { NewsletterField } from "~/src/presentation/components/custom/pages/account/profile/newsletter-field"

const ERROR_COPY = "We could not update your subscription. Please try again."

const renderField = (status?: string) => {
  mocks.status.current = status
  renderWithProviders(<NewsletterField email="anna@example.com" />)

  return screen.findByRole("button", { name: status === undefined ? "Subscribe" : "Unsubscribe" })
}

const queryClientWithLoadedStatus = (status: string): QueryClient => {
  mocks.status.current = status
  const queryClient = new QueryClient()
  queryClient.setQueryData(NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION, { status })

  return queryClient
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

    expect(await screen.findByText(englishAccount.profile.newsletterPending)).toBeInTheDocument()
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

  it("warns that the confirmation email could not be sent and claims nothing", async () => {
    mocks.subscribe.mockResolvedValue({ outcome: "confirmationFailed" })

    await userEvent.click(await renderField())

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(englishAccount.profile.newsletterConfirmationFailed)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it("offers to resend the confirmation while the signup is pending", async () => {
    await renderField(NEWSLETTER_STATUS.PENDING)

    await userEvent.click(screen.getByRole("button", { name: englishAccount.profile.newsletterResendAction }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(englishAccount.profile.newsletterConfirmationSent)
    })
    expect(mocks.subscribe.mock.calls[0]?.[0]).toStrictEqual({ email: "anna@example.com", source: NEWSLETTER_SOURCE.ACCOUNT })
    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })

  it("warns when a resend could not be sent and keeps the resend on offer", async () => {
    mocks.subscribe.mockResolvedValue({ outcome: "confirmationFailed" })
    await renderField(NEWSLETTER_STATUS.PENDING)

    await userEvent.click(screen.getByRole("button", { name: englishAccount.profile.newsletterResendAction }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(englishAccount.profile.newsletterConfirmationFailed)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: englishAccount.profile.newsletterResendAction })).toBeEnabled()
    expect(screen.getByText(englishAccount.profile.newsletterPending)).toBeInTheDocument()
  })

  it("refreshes the status after a failed send so the resend appears for the pending signup", async () => {
    mocks.subscribe.mockResolvedValue({ outcome: "confirmationFailed" })
    const button = await renderField()
    mocks.status.current = NEWSLETTER_STATUS.PENDING

    await userEvent.click(button)

    expect(await screen.findByRole("button", { name: englishAccount.profile.newsletterResendAction })).toBeEnabled()
    expect(screen.getByText(englishAccount.profile.newsletterPending)).toBeInTheDocument()
  })

  it("offers no resend once the subscription is confirmed", async () => {
    await renderField(NEWSLETTER_STATUS.CONFIRMED)

    expect(screen.queryByRole("button", { name: englishAccount.profile.newsletterResendAction })).not.toBeInTheDocument()
  })

  it("says the customer is already subscribed instead of sending them to their inbox", async () => {
    mocks.subscribe.mockResolvedValue({ outcome: "alreadyConfirmed" })

    await userEvent.click(await renderField())

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith(englishAccount.profile.newsletterAlreadySubscribed)
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith(englishAccount.profile.newsletterConfirmationSent)
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

describe("NewsletterField with the status the page loaded", () => {
  it("says a confirmed subscriber is subscribed on the first render", () => {
    renderWithProviders(<NewsletterField email="anna@example.com" />, {
      queryClient: queryClientWithLoadedStatus(NEWSLETTER_STATUS.CONFIRMED),
    })

    expect(screen.getByText(englishAccount.profile.subscribed)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: englishAccount.profile.newsletterUnsubscribeAction })).toBeEnabled()
    expect(screen.queryByText(englishAccount.profile.notSubscribed)).not.toBeInTheDocument()
  })

  it("says a confirmed subscriber is subscribed in Polish on the first render", () => {
    renderWithProviders(
      <IntlProvider locale="pl-PL" messages={{ pages: { account: polishAccount } }} timeZone={I18N.DEFAULT_TIMEZONE}>
        <NewsletterField email="anna@example.com" />
      </IntlProvider>,
      { queryClient: queryClientWithLoadedStatus(NEWSLETTER_STATUS.CONFIRMED) },
    )

    expect(screen.getByText(polishAccount.profile.subscribed)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: polishAccount.profile.newsletterUnsubscribeAction })).toBeEnabled()
    expect(screen.queryByText(polishAccount.profile.notSubscribed)).not.toBeInTheDocument()
  })
})
