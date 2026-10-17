import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

interface PageInput {
  readonly page: number
  readonly pageSize: number
  readonly search?: string | undefined
  readonly status?: string | undefined
}

const mocks = vi.hoisted(() => ({
  download: vi.fn<(file: { content: string }) => void>(),
  history: [] as CustomerAccount["loginHistoryItem"][],
  page: vi.fn<(input: PageInput) => void>(),
}))

const loadPage = (input: PageInput) => {
  mocks.page(input)
  const matching = mocks.history.filter(
    (entry) =>
      (input.status === undefined || entry.status === input.status) &&
      (input.search === undefined || entry.ipAddress?.includes(input.search) === true),
  )
  const offset = (input.page - 1) * input.pageSize

  return Promise.resolve({
    hasMore: offset + input.pageSize < matching.length,
    items: matching.slice(offset, offset + input.pageSize),
    limit: input.pageSize,
    offset,
    total: matching.length,
  })
}

vi.mock("~/src/modules/_core/utils/download", () => ({ downloadTextFile: mocks.download }))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-login-history-page", () => ({
  getCustomerLoginHistoryPage: ({ data }: { data: PageInput }) => loadPage(data),
  getCustomerLoginHistoryPageQuery: (input: PageInput) => ({
    queryFn: () => loadPage(input),
    queryKey: ["customer-account", "login-history", input],
  }),
}))

const { SettingsLoginHistoryGrid } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/components/settings-login-history-grid")

const entry = (index: number, overrides: Partial<CustomerAccount["loginHistoryItem"]> = {}): CustomerAccount["loginHistoryItem"] => ({
  createdAt: new Date(Date.UTC(2026, 9, 16, 12, 0) - index * 3_600_000),
  id: `audit-${String(index)}`,
  ipAddress: `198.51.100.${String(index)}`,
  status: "success",
  ...overrides,
})

const user = () => userEvent.setup({ delay: null })

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row").filter((element) => element.closest("tbody") !== null)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.history = [
    entry(0, { status: "failed" }),
    entry(1, { ipAddress: undefined }),
    ...Array.from({ length: 10 }, (_, index) => entry(index + 2)),
  ]
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("SettingsLoginHistoryGrid", () => {
  it("shows the first page of sign-in attempts newest first with their result and address", async () => {
    renderWithProviders(<SettingsLoginHistoryGrid />)

    expect(screen.getByRole("heading", { name: "Sign-in history" })).toBeInTheDocument()
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(10)
    })
    expect(mocks.page).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: undefined, status: undefined })
    expect(bodyRows()[0]).toHaveTextContent("Failed attempt")
    expect(bodyRows()[0]).toHaveTextContent("198.51.100.0")
    expect(bodyRows()[0]).toHaveTextContent("Oct 16, 2026")
    expect(bodyRows()[1]).toHaveTextContent("Successful sign-in")
    expect(bodyRows()[1]).toHaveTextContent("Not recorded")
    expect(screen.getByText("1–10 of 12")).toBeInTheDocument()
  })

  it("asks the server for the next page instead of loading the whole history", async () => {
    renderWithProviders(<SettingsLoginHistoryGrid />)
    await screen.findByText("Page 1 of 2")

    await user().click(screen.getByRole("button", { name: "Next page" }))

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument()
    expect(mocks.page).toHaveBeenLastCalledWith({ page: 2, pageSize: 10, search: undefined, status: undefined })
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(2)
    })
  })

  it("keeps only the failed attempts and starts again from the first page", async () => {
    renderWithProviders(<SettingsLoginHistoryGrid />)
    await screen.findByText("Page 1 of 2")
    await user().click(screen.getByRole("button", { name: "Next page" }))
    await screen.findByText("Page 2 of 2")

    await user().click(screen.getByRole("combobox", { name: "Filter by result" }))
    await user().click(await screen.findByRole("option", { name: "Failed attempt" }))

    await waitFor(() => {
      expect(mocks.page).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, search: undefined, status: "failed" })
    })
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })

    await user().click(screen.getByRole("combobox", { name: "Filter by result" }))
    await user().click(await screen.findByRole("option", { name: "All results" }))

    await waitFor(() => {
      expect(mocks.page).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, search: undefined, status: undefined })
    })
  })

  it("searches the history by IP address on the server", async () => {
    renderWithProviders(<SettingsLoginHistoryGrid />)
    await screen.findByText("Page 1 of 2")

    fireEvent.change(screen.getByPlaceholderText("Search by IP address..."), { target: { value: "198.51.100.11" } })

    await waitFor(() => {
      expect(mocks.page).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, search: "198.51.100.11", status: undefined })
    })
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })
  })

  it("exports every page of the filtered history, not only the page on screen", async () => {
    mocks.history = Array.from({ length: 260 }, (_, index) => entry(index))
    renderWithProviders(<SettingsLoginHistoryGrid />)
    await screen.findByText("Page 1 of 26")

    await user().click(screen.getByRole("button", { name: "Export" }))
    await user().click(await screen.findByRole("menuitem", { name: /^CSV/u }))

    await waitFor(() => {
      expect(mocks.download).toHaveBeenCalledTimes(1)
    })
    expect(mocks.page).toHaveBeenCalledWith({ page: 2, pageSize: 250, search: undefined, status: undefined })
    expect(mocks.download.mock.calls[0]?.[0].content.trim().split("\n")).toHaveLength(261)
  })

  it("names the result filter in an export of failed attempts", async () => {
    renderWithProviders(<SettingsLoginHistoryGrid />)
    await screen.findByText("Page 1 of 2")
    await user().click(screen.getByRole("combobox", { name: "Filter by result" }))
    await user().click(await screen.findByRole("option", { name: "Failed attempt" }))
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })

    await user().click(screen.getByRole("button", { name: "Export" }))
    await user().click(await screen.findByRole("menuitem", { name: /^TXT/u }))

    await waitFor(() => {
      expect(mocks.download.mock.calls[0]?.[0].content).toContain("Result: Failed attempt")
    })
  })
})
