import { type JSX, Suspense, useMemo } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { requireCustomer } from "~/src/integrations/better-auth/auth.routes"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { AccountErrorState, AccountNotFoundState } from "~/src/presentation/components/custom/pages/account/account-error-state"
import { AccountSidebar } from "~/src/presentation/components/custom/pages/account/account-sidebar"
import { Footer } from "~/src/presentation/components/custom/pages/landing-page/footer/footer"
import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"

import type accountMetaMessages from "~/messages/en-US/pages.account.meta.json"

const AccountSidebarFallback = (): JSX.Element => (
  <aside aria-hidden className="lg:sticky lg:top-28 lg:w-[220px] lg:shrink-0 lg:self-start">
    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    <div className="mt-6 space-y-2">
      {Array.from(
        {
          length: 7,
        },
        (_, index) => (
          <div key={`sk-${String(index)}`} className="h-9 animate-pulse rounded-md bg-muted/35" />
        ),
      )}
    </div>
  </aside>
)

const AccountMainFallback = (): JSX.Element => (
  <div className="min-h-[50vh] min-w-0 animate-pulse space-y-6" aria-hidden>
    <div className="h-3 w-36 rounded bg-muted" />
    <div className="h-10 max-w-sm rounded bg-muted/80" />
    <div className="h-24 rounded-lg bg-muted/40" />
  </div>
)

const AccountLayout = (): JSX.Element => {
  const sidebarFallback = useMemo(() => <AccountSidebarFallback />, [])
  const mainFallback = useMemo(() => <AccountMainFallback />, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <Navigation />
      <main className="mx-auto w-full max-w-400 flex-1 px-6 font-light lg:px-12">
        <div className="grid gap-x-16 gap-y-10 py-12 lg:grid-cols-[220px_1fr] lg:py-20 lg:pl-[116px]">
          <Suspense fallback={sidebarFallback}>
            <AccountSidebar />
          </Suspense>
          <Suspense fallback={mainFallback}>
            <div className="min-w-0 lg:min-h-[600px]">
              <Outlet />
            </div>
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export const Route = createFileRoute("/account")({
  beforeLoad: async ({ location }) => ({
    user: await requireCustomer(location.href),
  }),
  component: AccountLayout,
  errorComponent: AccountErrorState,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof accountMetaMessages>({ locale, namespace: "pages.account.meta" }),
    )

    return {
      description: messages.description,
      title: messages.title,
    } satisfies PageMeta
  },
  notFoundComponent: AccountNotFoundState,
  staticData: {
    namespaces: ["pages.account", "pages.account.meta", "pages.auth.errors", "pages.auth.validations"],
  },
})
