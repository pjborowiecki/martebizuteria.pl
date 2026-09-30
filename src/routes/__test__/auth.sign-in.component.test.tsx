import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type PageMeta, pageHead } from "~/src/lib/seo"

interface MessagesQueryStub<TMessages> {
  readonly queryFn: () => Promise<TMessages>
  readonly queryKey: readonly unknown[]
}

interface LoaderContext {
  readonly context: {
    readonly locale: SupportedLocale
    readonly queryClient: {
      readonly query: <TMessages>(options: MessagesQueryStub<TMessages>) => Promise<TMessages>
    }
  }
}

interface SignInRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<PageMeta>
  readonly staticData?: { readonly namespaces?: readonly string[] }
}

const captured: { current: SignInRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: SignInRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/presentation/components/custom/pages/auth/sign-in-with-password-form", () => ({
  SignInWithPasswordForm: (): JSX.Element => <p>sign in form</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/auth/social-providers", () => ({
  SocialProviders: (): JSX.Element => <p>social providers</p>,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

await import("~/src/routes/auth.sign-in")

const route = captured.current

if (route === undefined) {
  throw new Error("the sign in route registered no options")
}

const renderSignIn = () => {
  const SignInPage = route.component
  if (SignInPage === undefined) {
    throw new Error("the sign in route registered no component")
  }

  return renderWithProviders(<SignInPage />)
}

const seenQueryKeys: unknown[][] = []

const loadMeta = (locale: SupportedLocale = "en-US"): Promise<PageMeta> => {
  const { loader } = route
  if (loader === undefined) {
    throw new Error("the sign in route registered no loader")
  }
  seenQueryKeys.length = 0

  return loader({
    context: {
      locale,
      queryClient: {
        query: <TMessages,>(options: MessagesQueryStub<TMessages>) => {
          seenQueryKeys.push([...options.queryKey])

          return options.queryFn()
        },
      },
    },
  })
}

afterEach(() => {
  cleanup()
})

describe("auth sign in page", () => {
  it("welcomes the returning customer back", () => {
    renderSignIn()

    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument()
    expect(screen.getByText("Sign in to your account to continue your journey.")).toBeInTheDocument()
  })

  it("shows the password form and the social providers either side of the divider", () => {
    renderSignIn()

    expect(screen.getByText("sign in form")).toBeInTheDocument()
    expect(screen.getByText("or")).toBeInTheDocument()
    expect(screen.getByText("social providers")).toBeInTheDocument()
  })

  it("sends a visitor without an account to the sign up page", () => {
    renderSignIn()

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/auth/sign-up")
  })
})

describe("auth sign in route", () => {
  it("builds its document head with the shared page head helper", () => {
    expect(route.head).toBe(pageHead)
  })

  it("loads only the sign in namespace", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.auth.sign-in"] })
  })

  it("takes the document title and description from the sign in copy of the active locale", async () => {
    await expect(loadMeta()).resolves.toStrictEqual({
      description: "Sign in to your M'Arte account to track orders, manage your wishlist, and enjoy a personalised experience.",
      title: "Sign In | M'Arte",
    })
  })

  it("asks for the sign in messages of the active locale", async () => {
    await loadMeta()

    expect(seenQueryKeys).toStrictEqual([["messages", "en-US", "pages.auth.sign-in"]])
  })
})
