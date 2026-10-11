import { type JSX, Suspense } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_CAMPAIGN_ERROR_CODES } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

const remote = vi.hoisted(() => ({
  send: vi.fn<(input: NewsletterCampaign["sendInput"]) => Promise<{ recipientCount: number }>>(),
  stats: { current: { confirmed: 2, pending: 1, total: 4, unsubscribed: 1 } },
  test: vi.fn<(input: NewsletterCampaign["composeValues"]) => Promise<{ email: string }>>(),
}))

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options?: { description?: string }) => void>(),
  success: vi.fn<(title: string, options?: { description?: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: toasts }))
vi.mock("~/src/modules/newsletter/use-cases/get-newsletter-stats", () => ({
  getNewsletterStatsQuery: () => ({ queryFn: () => Promise.resolve(remote.stats.current), queryKey: ["admin", "newsletter", "stats"] }),
}))
vi.mock("~/src/modules/newsletter-campaign/use-cases/send-newsletter-campaign", () => ({
  sendNewsletterCampaignMutation: { mutationFn: (input: NewsletterCampaign["sendInput"]) => remote.send(input) },
}))
vi.mock("~/src/modules/newsletter-campaign/use-cases/send-newsletter-test", () => ({
  sendNewsletterTestMutation: { mutationFn: (input: NewsletterCampaign["composeValues"]) => remote.test(input) },
}))
vi.mock("~/src/presentation/components/custom/pages/admin/content/editor/content-editor", () => ({
  ContentEditor: ({
    invalid,
    label,
    markdown,
    onChange,
  }: Readonly<{ invalid: boolean; label: string; markdown: string; onChange: (markdown: string) => void }>): JSX.Element => (
    <textarea
      aria-invalid={invalid}
      aria-label={label}
      defaultValue={markdown}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    />
  ),
}))

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterComposer } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-composer"

const POLISH = { body: "Nowe pierścionki już są.", subject: "Jesienne projekty" }

const ENGLISH = { body: "New rings are in.", subject: "Autumn pieces" }

const LETTER = {
  bodies: { "en-US": ENGLISH.body, "pl-PL": POLISH.body },
  subjects: { "en-US": ENGLISH.subject, "pl-PL": POLISH.subject },
}

const renderComposer = async () => {
  const router = createTestRouter("/admin/marketing/new")
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <NewsletterComposer />
    </Suspense>,
    { router },
  )
  await screen.findByRole("textbox", { name: "Letter" })

  return { router }
}

const write = async ({ body, subject }: Readonly<{ body?: string; subject?: string }>): Promise<void> => {
  if (subject !== undefined) {
    await userEvent.type(screen.getByLabelText("Subject"), subject)
  }

  if (body !== undefined) {
    await userEvent.click(screen.getByRole("textbox", { name: "Letter" }))
    await userEvent.paste(body)
  }
}

const writeBothLanguages = async (): Promise<void> => {
  await write(POLISH)
  await userEvent.click(screen.getByRole("tab", { name: "English" }))
  await write(ENGLISH)
}

const confirmSend = async (): Promise<void> => {
  await userEvent.click(screen.getByRole("button", { name: "Send to subscribers" }))
  await screen.findByRole("alertdialog", { name: "Send this newsletter?" })
  await userEvent.click(screen.getByRole("button", { name: "Send now" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  remote.stats.current = { confirmed: 2, pending: 1, total: 4, unsubscribed: 1 }
  remote.send.mockResolvedValue({ recipientCount: 2 })
  remote.test.mockResolvedValue({ email: "owner@martebizuteria.pl" })
})

afterEach(cleanup)

describe("NewsletterComposer", () => {
  it("opens on the Polish letter and says how many confirmed subscribers it would reach", async () => {
    await renderComposer()

    expect(screen.getByRole("heading", { name: "New newsletter" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Polish", selected: true })).toBeInTheDocument()
    expect(screen.getByText("2 confirmed subscribers")).toBeInTheDocument()
    expect(screen.getByText("0/150")).toBeInTheDocument()
  })

  it("sends a test of both languages to the owner and says where it went", async () => {
    await renderComposer()
    await writeBothLanguages()

    await userEvent.click(screen.getByRole("button", { name: "Send test to me" }))

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Test sent", { description: "Both language versions went to owner@martebizuteria.pl." })
    })
    expect(remote.test).toHaveBeenCalledWith(LETTER)
    expect(remote.send).not.toHaveBeenCalled()
  })

  it("holds the test button while the test is on its way", async () => {
    const pending = Promise.withResolvers<{ email: string }>()
    remote.test.mockReturnValue(pending.promise)
    await renderComposer()
    await writeBothLanguages()

    await userEvent.click(screen.getByRole("button", { name: "Send test to me" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send test to me" })).toBeDisabled()
    })
    await act(async () => {
      pending.resolve({ email: "owner@martebizuteria.pl" })
      await pending.promise
    })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Send test to me" })).toBeEnabled()
    })
  })

  it("says a test failed and keeps the letter", async () => {
    remote.test.mockRejectedValue(new Error("offline"))
    await renderComposer()
    await writeBothLanguages()

    await userEvent.click(screen.getByRole("button", { name: "Send test to me" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("The test could not be sent", {
        description: "The audit log names the reason. Your letter is still here.",
      })
    })
    expect(screen.getByLabelText("Subject")).toHaveValue(ENGLISH.subject)
  })

  it("points at the language still missing its subject and letter instead of sending", async () => {
    await renderComposer()
    await write(POLISH)

    await userEvent.click(screen.getByRole("button", { name: "Send to subscribers" }))

    expect(await screen.findByText("Enter a subject.")).toBeInTheDocument()
    expect(screen.getByText("The letter needs some content.")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "English, contains errors", selected: true })).toBeInTheDocument()
    expect(toasts.error).toHaveBeenCalledWith("Some fields need attention", { description: "Check: English." })
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("flags a language whose letter alone is missing or links somewhere an inbox cannot open", async () => {
    await renderComposer()
    await write({ body: "Read the [FAQ](/faq).", subject: POLISH.subject })
    await userEvent.click(screen.getByRole("tab", { name: "English" }))
    await write({ subject: ENGLISH.subject })

    await userEvent.click(screen.getByRole("button", { name: "Send test to me" }))

    expect(
      await screen.findByText("The letter contains an image or a link that is not a full https://, mailto: or tel: address."),
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Polish, contains errors", selected: true })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "English, contains errors" })).toBeInTheDocument()
    expect(toasts.error).toHaveBeenCalledWith("Some fields need attention", { description: "Check: Polish, English." })
    expect(remote.test).not.toHaveBeenCalled()
  })
})

describe("NewsletterComposer sending", () => {
  it("asks before sending, then sends the letter once under the id it generated and shows the list", async () => {
    const { router } = await renderComposer()
    const navigate = vi.spyOn(router, "navigate")
    await writeBothLanguages()

    await userEvent.click(screen.getByRole("button", { name: "Send to subscribers" }))
    expect(await screen.findByText(/It goes to 2 confirmed subscribers now/u)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Send now" }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/admin/marketing" }))
    })
    expect(remote.send).toHaveBeenCalledOnce()
    expect(remote.send.mock.calls[0]?.[0]).toMatchObject(LETTER)
    expect(remote.send.mock.calls[0]?.[0].id).toMatch(/^[\da-f-]{36}$/u)
    expect(toasts.success).toHaveBeenCalledWith("Newsletter on its way", {
      description: "It is going out to 2 subscribers in batches. Follow its progress in the list.",
    })
    expect(screen.queryByRole("alertdialog", { name: "Leave without saving?" })).toBeNull()
  })

  it("keeps the letter and its id after a failed send, so trying again cannot send it twice", async () => {
    remote.send.mockRejectedValueOnce(new Error("offline"))
    await renderComposer()
    await writeBothLanguages()

    await confirmSend()
    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("The newsletter could not be sent", {
        description: "Nothing went out. Your letter is still here, so try again in a moment.",
      })
    })
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    await confirmSend()

    await waitFor(() => {
      expect(remote.send).toHaveBeenCalledTimes(2)
    })
    expect(remote.send.mock.calls[1]?.[0].id).toBe(remote.send.mock.calls[0]?.[0].id)
  })

  it("tells the owner a newsletter already went out and shows the list instead", async () => {
    remote.send.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, NEWSLETTER_CAMPAIGN_ERROR_CODES.ALREADY_SENT))
    const { router } = await renderComposer()
    const navigate = vi.spyOn(router, "navigate")
    await writeBothLanguages()

    await confirmSend()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/admin/marketing" }))
    })
    expect(toasts.error).toHaveBeenCalledWith("This newsletter was already sent", {
      description: "It is in the list of sent newsletters and will not go out twice.",
    })
  })

  it("says there is nobody to send to when the last subscriber left meanwhile", async () => {
    remote.send.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, NEWSLETTER_CAMPAIGN_ERROR_CODES.NO_RECIPIENTS))
    const { router } = await renderComposer()
    const navigate = vi.spyOn(router, "navigate")
    await writeBothLanguages()

    await confirmSend()

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Nobody to send to yet", {
        description: "The newsletter goes only to confirmed subscribers, and there are none yet.",
      })
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("offers no send while nobody has confirmed a subscription", async () => {
    remote.stats.current = { confirmed: 0, pending: 3, total: 3, unsubscribed: 0 }
    await renderComposer()

    expect(screen.getByText("No confirmed subscribers yet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send to subscribers" })).toBeDisabled()
  })
})

describe("NewsletterComposer leaving", () => {
  it("asks before discarding an unsent letter", async () => {
    const { router } = await renderComposer()
    await write({ subject: POLISH.subject })

    void router.navigate({ to: "/admin" })

    expect(await screen.findByRole("alertdialog", { name: "Leave without saving?" })).toBeInTheDocument()
  })

  it("lets an untouched composer go without asking", async () => {
    const { router } = await renderComposer()

    await act(async () => {
      await router.navigate({ to: "/admin" })
    })

    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
