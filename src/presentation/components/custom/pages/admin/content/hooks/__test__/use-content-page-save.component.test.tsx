import { type JSX, type ReactNode } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"

const SEEDED_AT = new Date("2026-09-29T08:00:00.000Z")

const SAVED_AT = new Date("2026-10-01T12:00:00.000Z")

const remote = vi.hoisted(() => ({
  update: vi.fn<(input: ContentPage["updateInput"]) => Promise<{ updatedAt: Date }>>(),
}))

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options?: { action?: { label: string; onClick: () => void }; description?: string }) => void>(),
  success: vi.fn<(title: string, options?: { description?: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: toasts }))
vi.mock("~/src/modules/content-page/use-cases/get-admin-content-page", async () => {
  const { CONTENT_PAGE_QUERY_KEYS } = await import("~/src/modules/content-page/content-page.constants")

  return {
    getAdminContentPageQuery: (handle: string) => ({ queryKey: [...CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE, handle] }),
  }
})
vi.mock("~/src/modules/content-page/use-cases/update-content-page", () => ({
  updateContentPageMutation: { mutationFn: (input: ContentPage["updateInput"]) => remote.update(input) },
}))

import { getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"

import {
  conflictToastId,
  toContentPageFormValues,
} from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"
import { useContentPageSave } from "~/src/presentation/components/custom/pages/admin/content/hooks/use-content-page-save"

const HANDLE = CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS

const seededPage = (): ContentPage["select"] => ({
  bodies: { "en-US": "## Returning goods\n\nYou have 14 days.", "pl-PL": "## Zwrot towaru\n\nMasz 14 dni." },
  createdAt: SEEDED_AT,
  descriptions: { "en-US": "How returns work.", "pl-PL": "Jak działają zwroty." },
  handle: HANDLE,
  id: "page-1",
  revisedAts: { "en-US": SEEDED_AT.getTime(), "pl-PL": SEEDED_AT.getTime() },
  titles: { "en-US": "Exchanges and returns", "pl-PL": "Wymiana i zwroty" },
  updatedAt: SEEDED_AT,
})

const pageQueryKey = getAdminContentPageQuery(HANDLE).queryKey

const renderSave = ({
  cachedPage,
  values = toContentPageFormValues(seededPage()),
}: Readonly<{ cachedPage?: ContentPage["select"]; values?: ContentPage["formValues"] }> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  if (cachedPage !== undefined) {
    queryClient.setQueryData(pageQueryKey, cachedPage)
  }
  const onInvalidLocale = vi.fn<(locale: SupportedLocale) => void>()
  const onReload = vi.fn<() => Promise<void>>().mockResolvedValue()
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      {children}
    </TestProviders>
  )
  const hook = renderHook(
    () => {
      const form = useForm<ContentPage["formValues"]>({ defaultValues: values, resolver: zodResolver(contentPageZodSchemas.formValues) })

      return { form, isDirty: form.formState.isDirty, ...useContentPageSave({ form, handle: HANDLE, onInvalidLocale, onReload }) }
    },
    { wrapper: Wrapper },
  )

  return { ...hook, onInvalidLocale, onReload, queryClient }
}

const retitle = (result: ReturnType<typeof renderSave>["result"], locale: SupportedLocale, title: string): void => {
  act(() => {
    result.current.form.setValue(`titles.${locale}`, title, { shouldDirty: true })
  })
}

const save = async (result: ReturnType<typeof renderSave>["result"]): Promise<void> => {
  await act(async () => {
    await result.current.save()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  remote.update.mockResolvedValue({ updatedAt: SAVED_AT })
})

afterEach(cleanup)

describe("useContentPageSave after the server accepts the save", () => {
  it("sends every language together with the handle and the revision it was opened at", async () => {
    const { result } = renderSave()
    retitle(result, "pl-PL", "Zwroty")

    await save(result)

    expect(remote.update).toHaveBeenCalledExactlyOnceWith({
      ...toContentPageFormValues(seededPage()),
      handle: HANDLE,
      titles: { "en-US": "Exchanges and returns", "pl-PL": "Zwroty" },
    })
  })

  it("patches the cached page with the saved copy and its new revision", async () => {
    const { queryClient, result } = renderSave({ cachedPage: seededPage() })
    retitle(result, "pl-PL", "Zwroty")

    await save(result)

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Page saved", { description: "Customers see the new version straight away." })
    })
    expect(queryClient.getQueryData(pageQueryKey)).toStrictEqual({
      ...seededPage(),
      titles: { "en-US": "Exchanges and returns", "pl-PL": "Zwroty" },
      updatedAt: SAVED_AT,
    })
    expect(result.current.form.getValues("expectedUpdatedAt")).toStrictEqual(SAVED_AT)
    expect(result.current.isDirty).toBe(false)
  })

  it("leaves the cache without an entry when the page was never cached", async () => {
    const { queryClient, result } = renderSave()

    await save(result)

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledOnce()
    })
    expect(queryClient.getQueryData(pageQueryKey)).toBeUndefined()
    expect(result.current.form.getValues("expectedUpdatedAt")).toStrictEqual(SAVED_AT)
  })

  it("keeps what was typed while the save was on its way and still counts it as unsaved", async () => {
    const pending: { resolve: (value: { updatedAt: Date }) => void } = { resolve: () => {} }
    remote.update.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.resolve = resolve
        }),
    )
    const { result } = renderSave()
    retitle(result, "pl-PL", "Zwroty")
    await save(result)
    retitle(result, "en-US", "Returns")

    await act(async () => {
      pending.resolve({ updatedAt: SAVED_AT })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledOnce()
    })
    expect(result.current.form.getValues("titles")).toStrictEqual({ "en-US": "Returns", "pl-PL": "Zwroty" })
    expect(result.current.isDirty).toBe(true)
  })
})

describe("useContentPageSave when the server refuses the save", () => {
  it("offers to reload when someone else saved the page first", async () => {
    remote.update.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    const { onReload, result } = renderSave()

    await save(result)

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledOnce()
    })
    const [title, options] = toasts.error.mock.lastCall ?? []
    expect(title).toBe("This page changed while you were editing")
    expect(options).toMatchObject({
      action: { label: "Reload" },
      description: "Someone else saved it first. Reload to see their version — your unsaved edits will be discarded.",
      duration: Number.POSITIVE_INFINITY,
      id: conflictToastId(HANDLE),
    })

    options?.action?.onClick()

    expect(onReload).toHaveBeenCalledOnce()
  })

  it("keeps the edits and says so when the save fails for another reason", async () => {
    remote.update.mockRejectedValue(new Error("offline"))
    const { onReload, result } = renderSave()
    retitle(result, "pl-PL", "Zwroty")

    await save(result)

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("The page could not be saved", {
        description: "Your edits are still here. Check your connection and try again.",
      })
    })
    expect(result.current.form.getValues("titles.pl-PL")).toBe("Zwroty")
    expect(onReload).not.toHaveBeenCalled()
  })
})

describe("useContentPageSave with invalid input", () => {
  it("moves to the first language that needs attention and names it", async () => {
    const { onInvalidLocale, result } = renderSave()
    retitle(result, "en-US", "")

    await save(result)

    expect(onInvalidLocale).toHaveBeenCalledExactlyOnceWith("en-US")
    expect(toasts.error).toHaveBeenCalledWith("Some fields need attention", { description: "Check: English." })
    expect(remote.update).not.toHaveBeenCalled()
  })

  it("stays on the current language when no localized field is at fault", async () => {
    const { onInvalidLocale, result } = renderSave({
      values: { ...toContentPageFormValues(seededPage()), expectedUpdatedAt: new Date(Number.NaN) },
    })

    await save(result)

    expect(onInvalidLocale).not.toHaveBeenCalled()
    expect(toasts.error.mock.lastCall?.[0]).toBe("Some fields need attention")
    expect(remote.update).not.toHaveBeenCalled()
  })
})
