import { Suspense } from "react"

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

const calls = vi.hoisted(() => ({
  erase: vi.fn<(input: { id: string }) => Promise<void>>(),
  exportSubscribers: vi.fn<(input: { data: unknown }) => Promise<Newsletter["adminListItem"][]>>(),
  page: vi.fn<(input: Record<string, unknown>) => Promise<SubscribersPage>>(),
  stats: vi.fn<() => Promise<Newsletter["adminStats"]>>(),
  syncQueryInvalidation: vi.fn<(queryClient: object, queryKey: readonly string[]) => Promise<void>>(),
  toastError: vi.fn<(message: string, options?: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options?: { description: string }) => void>(),
  unsubscribe: vi.fn<(input: { id: string }) => Promise<{ unsubscribed: boolean }>>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}))

interface SubscribersPage {
  readonly hasMore: boolean
  readonly items: Newsletter["adminListItem"][]
  readonly limit: number
  readonly offset: number
  readonly total: number
}

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: calls.syncQueryInvalidation }))
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-newsletter-subscriber", async () => {
  const { NEWSLETTER_MUTATION_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return {
    unsubscribeNewsletterSubscriberMutation: {
      mutationFn: calls.unsubscribe,
      mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_SUBSCRIBER,
    },
  }
})
vi.mock("~/src/modules/newsletter/use-cases/erase-newsletter-subscriber", async () => {
  const { NEWSLETTER_MUTATION_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return { eraseNewsletterSubscriberMutation: { mutationFn: calls.erase, mutationKey: NEWSLETTER_MUTATION_KEYS.ERASE_SUBSCRIBER } }
})
vi.mock("~/src/modules/newsletter/use-cases/get-admin-newsletter-page", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { NEWSLETTER_QUERY_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return {
    getAdminNewsletterPageQuery: (input: Record<string, unknown>) =>
      queryOptions({ queryFn: () => calls.page(input), queryKey: [...NEWSLETTER_QUERY_KEYS.ADMIN.PAGE, input] }),
  }
})
vi.mock("~/src/modules/newsletter/use-cases/get-newsletter-stats", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { NEWSLETTER_QUERY_KEYS } = await import("~/src/modules/newsletter/newsletter.constants")

  return { getNewsletterStatsQuery: () => queryOptions({ queryFn: () => calls.stats(), queryKey: NEWSLETTER_QUERY_KEYS.ADMIN.STATS }) }
})
vi.mock("~/src/modules/newsletter/use-cases/export-admin-newsletter-subscribers", () => ({
  exportAdminNewsletterSubscribers: calls.exportSubscribers,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NEWSLETTER_QUERY_KEYS, type NewsletterStatus } from "~/src/modules/newsletter/newsletter.constants"

import {
  buildNewsletterStats,
  buildSubscriber,
} from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/__test__/newsletter-subscriber.fixture"
import { NewsletterSubscribersTableContent } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-table"

const pageOf = (items: Newsletter["adminListItem"][], total = items.length): SubscribersPage => ({
  hasMore: false,
  items,
  limit: 50,
  offset: 0,
  total,
})

const renderSubscribers = (initialStatus?: NewsletterStatus) =>
  renderWithProviders(
    <Suspense fallback={<p>loading subscribers</p>}>
      <NewsletterSubscribersTableContent initialStatus={initialStatus} />
    </Suspense>,
  )

const rowOf = async (email: string): Promise<HTMLElement> => {
  const emailText = await screen.findByText(email)
  const row = emailText.closest("tr")
  if (row === null) {
    throw new Error(`no table row lists ${email}`)
  }

  return row
}

const cellUnder = async (email: string, column: string): Promise<HTMLElement | undefined> => {
  const row = await rowOf(email)
  const columns = screen.getAllByRole("columnheader").map((header) => header.textContent)

  return within(row).getAllByRole("cell")[columns.indexOf(column)]
}

const choose = async (select: string, option: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: select }))
  const options = await screen.findAllByRole("option")
  const match = options.find((candidate) => candidate.textContent === option)
  if (match === undefined) {
    throw new Error(`${select} offered no ${option} option`)
  }

  await userEvent.click(match)
}

const lastPageInput = () => calls.page.mock.calls.at(-1)?.[0]

const SUBSCRIBER_ID = "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50"

const openRowMenuItem = async (email: string, item: string): Promise<void> => {
  fireEvent.click(within(await rowOf(email)).getByRole("button", { name: "Actions" }))
  fireEvent.click(await screen.findByRole("menuitem", { name: item }))
}

const notFound = (): Error => Object.assign(new Error("NEWSLETTER_SUBSCRIBER_NOT_FOUND"), { code: "NOT_FOUND" })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  calls.page.mockResolvedValue(pageOf([buildSubscriber()]))
  calls.stats.mockResolvedValue(buildNewsletterStats())
  calls.writeText.mockResolvedValue(undefined)
  calls.unsubscribe.mockResolvedValue({ unsubscribed: true })
  calls.erase.mockResolvedValue(undefined)
  calls.syncQueryInvalidation.mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: calls.writeText } })
})

afterEach(() => {
  cleanup()
  document.body.style.pointerEvents = ""
})

describe("NewsletterSubscribersTableContent rows", () => {
  it("lists a subscriber with their status, language, sign-up place and dates", async () => {
    renderSubscribers()

    expect(await cellUnder("anna@example.com", "Status")).toHaveTextContent("Confirmed")
    expect(await cellUnder("anna@example.com", "Language")).toHaveTextContent("Polish")
    expect(await cellUnder("anna@example.com", "Signed up on")).toHaveTextContent("Home page")
    expect(await cellUnder("anna@example.com", "Signed up")).toHaveTextContent("Mar 1, 2026")
    expect(await cellUnder("anna@example.com", "Confirmed")).toHaveTextContent("Mar 1, 2026")
  })

  it("names each status the way the cards count it", async () => {
    calls.page.mockResolvedValue(
      pageOf([
        buildSubscriber({
          confirmedAt: undefined,
          email: "ben@example.com",
          id: "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f51",
          status: "pending",
        }),
        buildSubscriber({ email: "cara@example.com", id: "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f52", status: "unsubscribed" }),
      ]),
    )
    renderSubscribers()

    expect(await cellUnder("ben@example.com", "Status")).toHaveTextContent("Awaiting confirmation")
    expect(await cellUnder("ben@example.com", "Confirmed")).toHaveTextContent("—")
    expect(await cellUnder("cara@example.com", "Status")).toHaveTextContent("Unsubscribed")
  })

  it("links a subscriber with a customer account to that account and says when there is none", async () => {
    calls.page.mockResolvedValue(
      pageOf([
        buildSubscriber({ source: "account", userId: "user-1" }),
        buildSubscriber({ email: "guest@example.com", id: "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f53", locale: "en-US", source: "checkout" }),
      ]),
    )
    renderSubscribers()

    expect(
      within((await cellUnder("anna@example.com", "Account")) ?? document.body).getByRole("link", { name: "Open account" }),
    ).toHaveAttribute("href", "/admin/customers/user-1")
    expect(await cellUnder("anna@example.com", "Signed up on")).toHaveTextContent("Customer account")
    expect(await cellUnder("guest@example.com", "Account")).toHaveTextContent("No account")
    expect(await cellUnder("guest@example.com", "Language")).toHaveTextContent("English")
    expect(await cellUnder("guest@example.com", "Signed up on")).toHaveTextContent("Checkout")
  })

  it("keeps the ID and unsubscribe date out of the way until they are asked for", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent)

    expect(headers).not.toContain("ID")
    expect(headers).not.toContain("Unsubscribed")
  })

  it("shows the ID and unsubscribe date once they are switched on", async () => {
    const unsubscribed = buildSubscriber({ status: "unsubscribed", unsubscribedAt: new Date("2026-04-02T09:00:00.000Z") })
    calls.page.mockResolvedValue(pageOf([unsubscribed]))
    renderSubscribers()
    await rowOf("anna@example.com")

    await userEvent.click(screen.getByRole("button", { name: "Show or hide columns" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "ID" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Unsubscribed" }))

    expect(await cellUnder("anna@example.com", "ID")).toHaveTextContent("5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50")
    expect(await cellUnder("anna@example.com", "Unsubscribed")).toHaveTextContent("Apr 2, 2026")
  })

  it("says there is nothing to show when no subscriber matches", async () => {
    calls.page.mockResolvedValue(pageOf([]))
    renderSubscribers()

    expect(await screen.findByText("No data to display")).toBeInTheDocument()
  })

  it("copies the address from the row menu", async () => {
    renderSubscribers()
    fireEvent.click(within(await rowOf("anna@example.com")).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy email" }))

    expect(calls.writeText).toHaveBeenCalledExactlyOnceWith("anna@example.com")
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Email copied to clipboard")
  })
})

describe("NewsletterSubscribersTableContent stats", () => {
  it("counts every address and each status on its own card", async () => {
    renderSubscribers()

    expect(await screen.findByRole("button", { name: /All addresses/u })).toHaveTextContent("20")
    expect(screen.getByRole("button", { name: /Confirmed subscribers/u })).toHaveTextContent("12")
    expect(screen.getByRole("button", { name: /Awaiting confirmation/u })).toHaveTextContent("3")
    expect(screen.getByRole("button", { name: /Unsubscribed/u })).toHaveTextContent("5")
  })

  it("narrows the list to one status from its card and widens it again from the same card or the total", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")

    expect(screen.getByRole("button", { name: /All addresses/u })).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(screen.getByRole("button", { name: /Awaiting confirmation/u }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 1, status: "pending" })
    })
    expect(screen.getByRole("button", { name: /Awaiting confirmation/u })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveTextContent("Awaiting confirmation")

    fireEvent.click(screen.getByRole("button", { name: /Awaiting confirmation/u }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: undefined })
    })

    fireEvent.click(screen.getByRole("button", { name: /Unsubscribed/u }))
    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: "unsubscribed" })
    })
    fireEvent.click(screen.getByRole("button", { name: /All addresses/u }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /All addresses/u })).toHaveAttribute("aria-pressed", "true")
    })
    expect(lastPageInput()).toMatchObject({ status: undefined })
  })

  it("opens on the status the link asked for", async () => {
    renderSubscribers("confirmed")
    await rowOf("anna@example.com")

    expect(calls.page.mock.calls[0]?.[0]).toMatchObject({ page: 1, pageSize: 50, status: "confirmed" })
    expect(screen.getByRole("button", { name: /Confirmed subscribers/u })).toHaveAttribute("aria-pressed", "true")
  })

  it("holds the stat cards still until fresh numbers arrive", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")
    calls.stats.mockReturnValue(new Promise(() => {}))

    fireEvent.click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirmed subscribers/u })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: /Confirmed subscribers/u })).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("12")).not.toBeInTheDocument()
  })
})

describe("NewsletterSubscribersTableContent toolbar", () => {
  it("asks the server for the typed search", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")

    fireEvent.change(screen.getByLabelText("Search by email..."), { target: { value: "anna" } })

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 1, search: "anna" })
    })
  })

  it("asks the server for one status at a time and for everyone again", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")

    await choose("Filter by status", "Unsubscribed")

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: "unsubscribed" })
    })

    await choose("Filter by status", "All statuses")

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: undefined })
    })
  })

  it("pages through subscribers on the server", async () => {
    calls.page.mockResolvedValue(pageOf([buildSubscriber()], 120))
    renderSubscribers()
    await rowOf("anna@example.com")

    fireEvent.click(screen.getByRole("button", { name: "Next page" }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 2, pageSize: 50 })
    })
  })

  it("reloads the subscriber list and stats on request", async () => {
    renderSubscribers()
    await rowOf("anna@example.com")
    const pageReads = calls.page.mock.calls.length

    fireEvent.click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(calls.page.mock.calls.length).toBeGreaterThan(pageReads)
    })
    expect(calls.stats).toHaveBeenCalledTimes(2)
  })
})

describe("NewsletterSubscribersTableContent unsubscribing", () => {
  it("offers to unsubscribe only an address that is still on the newsletter", async () => {
    calls.page.mockResolvedValue(pageOf([buildSubscriber({ status: "unsubscribed" })]))
    renderSubscribers()
    fireEvent.click(within(await rowOf("anna@example.com")).getByRole("button", { name: "Actions" }))

    expect(await screen.findByRole("menuitem", { name: "Erase data" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Unsubscribe" })).not.toBeInTheDocument()
  })

  it("confirms before unsubscribing an address and names it once it is out", async () => {
    const { queryClient } = renderSubscribers()
    await openRowMenuItem("anna@example.com", "Unsubscribe")
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByRole("heading", { name: "Unsubscribe this address?" })).toBeInTheDocument()
    expect(within(dialog).getByText(/anna@example.com will stop receiving the newsletter/u)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Unsubscribe" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Address unsubscribed", {
        description: "anna@example.com will no longer receive the newsletter.",
      })
    })
    expect(calls.unsubscribe.mock.calls[0]?.[0]).toStrictEqual({ id: SUBSCRIBER_ID })
    expect(calls.erase).not.toHaveBeenCalled()
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, NEWSLETTER_QUERY_KEYS.ADMIN.ALL)
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })

  it("says the unsubscribe failed and keeps the confirmation open", async () => {
    calls.unsubscribe.mockRejectedValue(new Error("database locked"))
    renderSubscribers()
    await openRowMenuItem("anna@example.com", "Unsubscribe")
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Unsubscribe" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("The address could not be unsubscribed", {
        description: "Nothing has changed. Please try again in a moment.",
      })
    })
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(calls.toastSuccess).not.toHaveBeenCalled()
  })

  it("locks the confirmation while the address is being unsubscribed", async () => {
    calls.unsubscribe.mockReturnValue(new Promise(() => {}))
    renderSubscribers()
    await openRowMenuItem("anna@example.com", "Unsubscribe")
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Unsubscribe" }))

    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Unsubscribe" })).toBeDisabled()
    })
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled()
  })
})

describe("NewsletterSubscribersTableContent erasing", () => {
  it("confirms before erasing an address's data and says it is off the list once gone", async () => {
    const { queryClient } = renderSubscribers()
    await openRowMenuItem("anna@example.com", "Erase data")
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByRole("heading", { name: "Erase this subscriber's data?" })).toBeInTheDocument()
    expect(within(dialog).getByText(/anna@example.com will be removed from the list/u)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Erase data" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Data erased", {
        description: "anna@example.com is no longer on the subscriber list.",
      })
    })
    expect(calls.erase.mock.calls[0]?.[0]).toStrictEqual({ id: SUBSCRIBER_ID })
    expect(calls.unsubscribe).not.toHaveBeenCalled()
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, NEWSLETTER_QUERY_KEYS.ADMIN.ALL)
  })

  it("says the address is already gone and refreshes the list when someone else removed it first", async () => {
    calls.erase.mockRejectedValue(notFound())
    const { queryClient } = renderSubscribers()
    await openRowMenuItem("anna@example.com", "Erase data")
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Erase data" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("The data could not be erased", {
        description: "This address is no longer on the list. The table has been refreshed.",
      })
    })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, NEWSLETTER_QUERY_KEYS.ADMIN.ALL)
  })

  it("closes the confirmation without erasing anything on cancel", async () => {
    renderSubscribers()
    await openRowMenuItem("anna@example.com", "Erase data")
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(calls.erase).not.toHaveBeenCalled()
  })
})
