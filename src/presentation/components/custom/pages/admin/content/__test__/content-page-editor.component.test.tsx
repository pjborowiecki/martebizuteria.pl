import { Suspense } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

const SEEDED_AT = new Date("2026-09-29T08:00:00.000Z")

const SAVED_AT = new Date("2026-10-01T12:00:00.000Z")

const remote = vi.hoisted(() => ({
  page: undefined as ContentPage["select"] | undefined,
  update: vi.fn<(input: ContentPage["updateInput"]) => Promise<{ updatedAt: Date }>>(),
}))

const toasts = vi.hoisted(() => ({
  dismiss: vi.fn<(id?: string) => void>(),
  error: vi.fn<(title: string, options?: { action?: { label: string; onClick: () => void }; description?: string }) => void>(),
  success: vi.fn<(title: string, options?: { description?: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: toasts }))
vi.mock("~/src/modules/content-page/use-cases/get-admin-content-page", () => ({
  getAdminContentPageQuery: (handle: string) => ({
    queryFn: () => Promise.resolve(remote.page),
    queryKey: ["admin", "content-page", handle],
  }),
}))
vi.mock("~/src/modules/content-page/use-cases/update-content-page", () => ({
  updateContentPageMutation: { mutationFn: (input: ContentPage["updateInput"]) => remote.update(input) },
}))

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentPageEditor } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor"

const seededPage = (overrides: Partial<ContentPage["select"]> = {}): ContentPage["select"] => ({
  bodies: { "en-US": "## Returning goods\n\nYou have 14 days.", "pl-PL": "## Zwrot towaru\n\nMasz 14 dni." },
  createdAt: SEEDED_AT,
  descriptions: { "en-US": "How returns work.", "pl-PL": "Jak działają zwroty." },
  handle: "exchanges-and-returns",
  id: "page-1",
  revisedAts: { "en-US": SEEDED_AT.getTime(), "pl-PL": SEEDED_AT.getTime() },
  titles: { "en-US": "Exchanges and returns", "pl-PL": "Wymiana i zwroty" },
  updatedAt: SEEDED_AT,
  ...overrides,
})

const renderEditor = async () => {
  const router = createTestRouter()
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <ContentPageEditor handle="exchanges-and-returns" />
    </Suspense>,
    { router },
  )
  await screen.findByRole("textbox", { name: "Page content" })

  return { router }
}

const saveButton = () => screen.getByRole("button", { name: /^Save/u })

const canSave = (): boolean => saveButton().getAttribute("aria-disabled") !== "true"

const titleInput = () => screen.getByLabelText("Title")

beforeEach(() => {
  vi.clearAllMocks()
  remote.page = seededPage()
  remote.update.mockResolvedValue({ updatedAt: SAVED_AT })
})

afterEach(cleanup)

describe("ContentPageEditor fields", () => {
  it("opens on the Polish original with its title, description and length", async () => {
    await renderEditor()

    expect(screen.getByRole("tab", { name: "Polish", selected: true })).toBeInTheDocument()
    expect(titleInput()).toHaveValue("Wymiana i zwroty")
    expect(screen.getByLabelText("Search description")).toHaveValue("Jak działają zwroty.")
    expect(screen.getByText("20/300")).toBeInTheDocument()
  })

  it("switches to the English copy and keeps the Polish edit when switching back", async () => {
    await renderEditor()

    await userEvent.clear(titleInput())
    await userEvent.type(titleInput(), "Zwroty")
    await userEvent.click(screen.getByRole("tab", { name: "English" }))
    expect(titleInput()).toHaveValue("Exchanges and returns")

    await userEvent.click(screen.getByRole("tab", { name: "Polish" }))
    expect(titleInput()).toHaveValue("Zwroty")
  })
})

describe("ContentPageEditor saving", () => {
  it("only offers to save once something changed", async () => {
    await renderEditor()

    expect(canSave()).toBe(false)
    expect(screen.getByText(/^Saved /u)).toBeInTheDocument()

    await userEvent.type(titleInput(), "!")

    expect(canSave()).toBe(true)
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()
  })

  it("saves every language together with the revision it was opened at", async () => {
    await renderEditor()

    await userEvent.clear(titleInput())
    await userEvent.type(titleInput(), "  Zwroty  ")
    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledOnce()
    })
    expect(remote.update.mock.lastCall?.[0]).toStrictEqual({
      bodies: seededPage().bodies,
      descriptions: seededPage().descriptions,
      expectedUpdatedAt: SEEDED_AT,
      handle: "exchanges-and-returns",
      titles: { "en-US": "Exchanges and returns", "pl-PL": "Zwroty" },
    })
    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Page saved", { description: "Customers see the new version straight away." })
    })
    expect(canSave()).toBe(false)
    expect(titleInput()).toHaveValue("Zwroty")
  })

  it("bases the next save on the revision the last save produced", async () => {
    await renderEditor()

    await userEvent.type(titleInput(), "!")
    await userEvent.click(saveButton())
    await waitFor(() => {
      expect(canSave()).toBe(false)
    })
    await userEvent.type(titleInput(), "?")
    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledTimes(2)
    })
    expect(remote.update.mock.lastCall?.[0].expectedUpdatedAt).toStrictEqual(SAVED_AT)
  })

  it("saves with the keyboard shortcut", async () => {
    await renderEditor()

    await userEvent.type(titleInput(), "!")
    await userEvent.keyboard("{Control>}s{/Control}")

    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledOnce()
    })
  })

  it("keeps the edits and says so when the save fails", async () => {
    remote.update.mockRejectedValue(new Error("offline"))
    await renderEditor()

    await userEvent.type(titleInput(), "!")
    await userEvent.click(saveButton())

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("The page could not be saved", {
        description: "Your edits are still here. Check your connection and try again.",
      })
    })
    expect(titleInput()).toHaveValue("Wymiana i zwroty!")
    expect(canSave()).toBe(true)
  })
})

describe("ContentPageEditor typing during a save", () => {
  it("keeps what was typed while the save was on its way and still counts it as unsaved", async () => {
    const pending: { resolve: (value: { updatedAt: Date }) => void } = { resolve: () => {} }
    remote.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.resolve = resolve
        }),
    )
    await renderEditor()

    await userEvent.type(titleInput(), "!")
    await userEvent.click(saveButton())
    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledOnce()
    })
    await userEvent.type(titleInput(), "?")
    await act(async () => {
      pending.resolve({ updatedAt: SAVED_AT })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledOnce()
    })
    expect(titleInput()).toHaveValue("Wymiana i zwroty!?")
    expect(canSave()).toBe(true)
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument()
  })
})

describe("ContentPageEditor conflicts and validation", () => {
  it("warns when someone else saved first and reloads their version on request", async () => {
    remote.update.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    await renderEditor()

    await userEvent.type(titleInput(), "!")
    await userEvent.click(saveButton())
    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledOnce()
    })
    const [title, options] = toasts.error.mock.lastCall ?? []
    expect(title).toBe("This page changed while you were editing")

    remote.page = seededPage({ titles: { "en-US": "Returns", "pl-PL": "Zwroty po zmianie" }, updatedAt: SAVED_AT })
    await act(async () => {
      options?.action?.onClick()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(titleInput()).toHaveValue("Zwroty po zmianie")
    })
    expect(canSave()).toBe(false)
    expect(toasts.dismiss).toHaveBeenCalledWith("content-page-conflict-exchanges-and-returns")
  })

  it("shows which language still needs attention instead of saving", async () => {
    await renderEditor()

    await userEvent.click(screen.getByRole("tab", { name: "English" }))
    await userEvent.clear(titleInput())
    await userEvent.click(screen.getByRole("tab", { name: "Polish" }))
    await userEvent.click(saveButton())

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "English, contains errors", selected: true })).toBeInTheDocument()
    expect(toasts.error).toHaveBeenCalledWith("Some fields need attention", { description: "Check: English." })
    expect(remote.update).not.toHaveBeenCalled()
  })
})

describe("ContentPageEditor leaving", () => {
  it("asks before discarding unsaved changes", async () => {
    const { router } = await renderEditor()

    await userEvent.type(titleInput(), "!")
    void router.navigate({ to: "/admin" })

    expect(await screen.findByRole("alertdialog", { name: "Leave without saving?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    expect(router.state.location.pathname).toBe("/")
    expect(titleInput()).toHaveValue("Wymiana i zwroty!")
  })

  it("stays on the page when the question is dismissed with Escape", async () => {
    const { router } = await renderEditor()

    await userEvent.type(titleInput(), "!")
    void router.navigate({ to: "/admin" })
    await screen.findByRole("alertdialog", { name: "Leave without saving?" })
    await userEvent.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    expect(router.state.location.pathname).toBe("/")
  })

  it("lets an untouched page go without asking", async () => {
    const { router } = await renderEditor()

    await act(async () => {
      await router.navigate({ to: "/admin" })
    })

    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
