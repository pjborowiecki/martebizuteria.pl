import { type JSX } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface TestQueryClient {
  readonly query: <TData>(options: { readonly queryFn: () => Promise<TData> }) => Promise<TData>
}

interface ResetPasswordRouteOptions {
  readonly loader?: (args: Readonly<{ context: { locale: SupportedLocale; queryClient: TestQueryClient } }>) => Promise<PageMeta>
}

const search = vi.hoisted((): { token?: string | undefined } => ({ token: undefined }))

const captured = vi.hoisted((): { current?: ResetPasswordRouteOptions } => ({}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return {
    ...actual,
    createFileRoute: () => (options: ResetPasswordRouteOptions) => {
      captured.current = options

      return { options, useSearch: () => search }
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/auth/reset-password-form", () => ({
  ResetPasswordForm: ({ token }: Readonly<{ token: string }>): JSX.Element => <p>{`form for ${token}`}</p>,
}))

import { Route } from "~/src/routes/auth.reset-password"

const ResetPasswordPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the reset password route renders no component")
  }

  return <Page />
}

beforeEach(() => {
  search.token = undefined
})

afterEach(cleanup)

describe("auth reset password page", () => {
  it("rejects a link that carries no token", () => {
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByText("Invalid or expired password reset link. Please request a new one.")).toBeInTheDocument()
  })

  it("rejects a link whose token is empty", () => {
    search.token = ""
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByText("Invalid or expired password reset link. Please request a new one.")).toBeInTheDocument()
  })

  it("shows no form for an invalid link", () => {
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.queryByText(/^form for/u)).toBeNull()
  })

  it("hands the token from the link to the form", () => {
    search.token = "reset-token-123"
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByText("form for reset-token-123")).toBeInTheDocument()
  })

  it("titles the page above the form", () => {
    search.token = "reset-token-123"
    renderWithProviders(<ResetPasswordPage />)

    expect(screen.getByText("New password")).toBeInTheDocument()
    expect(screen.getByText("Enter a new password for your account.")).toBeInTheDocument()
  })
})

describe("auth reset password route", () => {
  it("loads only the reset password namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.auth.reset-password"] })
  })

  it("registers the shared page head builder", () => {
    expect(Route.options.head).toBe(pageHead)
  })

  it("feeds the meta title and description into the head from the message catalogue", async () => {
    const queryClient: TestQueryClient = { query: (options) => options.queryFn() }

    await expect(captured.current?.loader?.({ context: { locale: "en-US", queryClient } })).resolves.toStrictEqual({
      description: "Set a new password for your M'Arte account.",
      title: "Set New Password | M'Arte",
    })
  })
})
