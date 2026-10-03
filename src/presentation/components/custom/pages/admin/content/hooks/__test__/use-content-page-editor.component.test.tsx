import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { createBrowserHistory, createRootRoute, createRouter } from "@tanstack/react-router"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
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
vi.mock("~/src/modules/content-page/use-cases/get-admin-content-page", async () => {
  const { CONTENT_PAGE_QUERY_KEYS } = await import("~/src/modules/content-page/content-page.constants")

  return {
    getAdminContentPageQuery: (handle: string) => ({
      queryFn: () => Promise.resolve(remote.page),
      queryKey: [...CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE, handle],
    }),
  }
})
vi.mock("~/src/modules/content-page/use-cases/update-content-page", () => ({
  updateContentPageMutation: { mutationFn: (input: ContentPage["updateInput"]) => remote.update(input) },
}))

import { getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"

import { conflictToastId } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"
import { useContentPageEditor } from "~/src/presentation/components/custom/pages/admin/content/hooks/use-content-page-editor"

const HANDLE = CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS

const seededPage = (overrides: Partial<ContentPage["select"]> = {}): ContentPage["select"] => ({
  bodies: { "en-US": "## Returning goods\n\nYou have 14 days.", "pl-PL": "## Zwrot towaru\n\nMasz 14 dni." },
  createdAt: SEEDED_AT,
  descriptions: { "en-US": "How returns work.", "pl-PL": "Jak działają zwroty." },
  handle: HANDLE,
  id: "page-1",
  revisedAts: { "en-US": SEEDED_AT.getTime(), "pl-PL": SEEDED_AT.getTime() },
  titles: { "en-US": "Exchanges and returns", "pl-PL": "Wymiana i zwroty" },
  updatedAt: SEEDED_AT,
  ...overrides,
})

const EditorHarness = (): JSX.Element => {
  const { activeLocale, form, isPending, revision, saveOnShortcut, submit } = useContentPageEditor(HANDLE)

  return (
    <div onKeyDown={saveOnShortcut} role="presentation">
      <form noValidate onSubmit={submit}>
        <input aria-label="Title" {...form.register(`titles.${activeLocale}`)} />
        <button type="submit">Save</button>
      </form>
      <p data-testid="language">{activeLocale}</p>
      <p data-testid="revision">{revision}</p>
      <p data-testid="saving">{String(isPending)}</p>
    </div>
  )
}

const renderEditor = (router = createTestRouter()) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(getAdminContentPageQuery(HANDLE).queryKey, seededPage())

  return renderWithProviders(<EditorHarness />, { queryClient, router })
}

const titleInput = () => screen.getByLabelText("Title")

const pressShortcut = (init: Readonly<{ ctrlKey?: boolean; key: string; metaKey?: boolean }>): boolean =>
  fireEvent.keyDown(titleInput(), init)

beforeEach(() => {
  vi.clearAllMocks()
  remote.page = seededPage()
  remote.update.mockResolvedValue({ updatedAt: SAVED_AT })
})

afterEach(cleanup)

describe("useContentPageEditor", () => {
  it("opens on the default language with the stored copy at its first revision", () => {
    renderEditor()

    expect(screen.getByTestId("language")).toHaveTextContent("pl-PL")
    expect(titleInput()).toHaveValue("Wymiana i zwroty")
    expect(screen.getByTestId("revision")).toHaveTextContent("0")
  })

  it("saves when the form is submitted", async () => {
    renderEditor()
    await userEvent.type(titleInput(), "!")

    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledOnce()
    })
    expect(remote.update.mock.lastCall?.[0].titles["pl-PL"]).toBe("Wymiana i zwroty!")
  })

  it("loads the other editor's version and starts a new revision when asked to reload after a conflict", async () => {
    remote.update.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    renderEditor()
    await userEvent.type(titleInput(), "!")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledOnce()
    })
    remote.page = seededPage({ titles: { "en-US": "Returns", "pl-PL": "Zwroty po zmianie" }, updatedAt: SAVED_AT })

    await act(async () => {
      toasts.error.mock.lastCall?.[1]?.action?.onClick()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(titleInput()).toHaveValue("Zwroty po zmianie")
    })
    expect(screen.getByTestId("revision")).toHaveTextContent("1")
    expect(toasts.dismiss).toHaveBeenCalledWith(conflictToastId(HANDLE))
  })
})

describe("useContentPageEditor save shortcut", () => {
  it.each([
    ["Ctrl+S", { ctrlKey: true, key: "s" }],
    ["Cmd+S", { key: "S", metaKey: true }],
  ] as const)("saves the edits with %s instead of opening the browser's save dialog", async (_label, shortcut) => {
    renderEditor()
    await userEvent.type(titleInput(), "!")

    expect(pressShortcut(shortcut)).toBe(false)

    await waitFor(() => {
      expect(remote.update).toHaveBeenCalledOnce()
    })
  })

  it("still holds back the browser's save dialog when there is nothing to save", () => {
    renderEditor()

    expect(pressShortcut({ ctrlKey: true, key: "s" })).toBe(false)
    expect(remote.update).not.toHaveBeenCalled()
  })

  it("does not start a second save while the first one is on its way", async () => {
    remote.update.mockReturnValue(new Promise(() => {}))
    renderEditor()
    await userEvent.type(titleInput(), "!")
    pressShortcut({ ctrlKey: true, key: "s" })
    await waitFor(() => {
      expect(screen.getByTestId("saving")).toHaveTextContent("true")
    })

    expect(pressShortcut({ ctrlKey: true, key: "s" })).toBe(false)
    expect(remote.update).toHaveBeenCalledOnce()
  })

  it("leaves other key combinations to the browser", async () => {
    renderEditor()
    await userEvent.type(titleInput(), "!")

    expect(pressShortcut({ ctrlKey: true, key: "p" })).toBe(true)
    expect(pressShortcut({ key: "s" })).toBe(true)
    expect(remote.update).not.toHaveBeenCalled()
  })
})

const browserRouters: ReturnType<typeof createTestRouter>[] = []

const browserRouter = (): ReturnType<typeof createTestRouter> => {
  const router = createRouter({ history: createBrowserHistory(), routeTree: createRootRoute() })
  browserRouters.push(router)

  return router
}

const unload = (): Event => {
  const event = new Event("beforeunload", { cancelable: true })
  globalThis.dispatchEvent(event)

  return event
}

describe("useContentPageEditor leaving the browser tab", () => {
  afterEach(() => {
    for (const router of browserRouters.splice(0)) {
      router.history.destroy()
    }
  })

  it("asks the browser to confirm before unloading a page with unsaved edits", async () => {
    renderEditor(browserRouter())
    await userEvent.type(titleInput(), "!")

    expect(unload().defaultPrevented).toBe(true)
  })

  it("lets the browser unload an untouched page", () => {
    renderEditor(browserRouter())

    expect(unload().defaultPrevented).toBe(false)
  })
})
