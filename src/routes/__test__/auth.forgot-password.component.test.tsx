import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import forgotPasswordMessages from "~/messages/en-US/pages.auth.forgot-password.json"

interface RouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (ctx: Readonly<{ context: { locale: SupportedLocale; queryClient: QueryClient } }>) => Promise<PageMeta>
  readonly staticData?: unknown
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/auth/forgot-password-form", () => ({
  ForgotPasswordForm: (): JSX.Element => <form aria-label="forgot password form" />,
}))

await import("~/src/routes/auth.forgot-password")

const route = captured.current

if (route?.component === undefined || route.loader === undefined) {
  throw new Error("the forgot password route registered no component or loader")
}

const ForgotPasswordPage = route.component

const runLoader = () =>
  route.loader?.({ context: { locale: "en-US", queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) } })

afterEach(cleanup)

describe("auth forgot password page", () => {
  it("asks for the email address that should receive the link", () => {
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Reset password" })).toBeInTheDocument()
    expect(screen.getByText("Enter your email address and we'll send you a link to reset your password.")).toBeInTheDocument()
  })

  it("puts the reset request form on the page", () => {
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole("form", { name: "forgot password form" })).toBeInTheDocument()
  })

  it("offers the way back to signing in", () => {
    renderWithProviders(<ForgotPasswordPage />)

    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/auth/sign-in")
  })
})

describe("auth forgot password route", () => {
  it("loads only the forgot password namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.auth.forgot-password"] })
  })

  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })

  it("takes the document title and description from the forgot password meta block, not from the on-page copy", async () => {
    await expect(runLoader()).resolves.toStrictEqual({
      description: forgotPasswordMessages.meta.description,
      title: forgotPasswordMessages.meta.title,
    })
    expect(forgotPasswordMessages.meta.title).not.toBe(forgotPasswordMessages.title)
  })
})
