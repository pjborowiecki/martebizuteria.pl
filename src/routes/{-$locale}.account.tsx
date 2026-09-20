import { type JSX, Suspense, useMemo } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { requireCustomer } from "~/src/integrations/better-auth/auth.guards"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { AccountSidebar } from "~/src/presentation/components/custom/pages/account/account-sidebar"
import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"
const AccountSidebarFallback = (): JSX.Element => (
  <aside className="hidden lg:sticky lg:top-28 lg:block lg:w-[220px] lg:shrink-0 lg:self-start" aria-hidden>
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
    <>
      <Navigation />
      <main className="mx-auto max-w-400 flex-1 px-6 font-light lg:px-12">
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
    </>
  )
}
interface AccountPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/account")({
  beforeLoad: async () => ({
    user: await requireCustomer(),
  }),
  component: AccountLayout,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<AccountPageMeta> | undefined
  }>) => ({
    meta: [
      {
        title: loaderData?.title ?? APP_NAME,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
      {
        content: loaderData?.title ?? APP_NAME,
        property: "og:title",
      },
      {
        content: loaderData?.description ?? "",
        property: "og:description",
      },
    ],
  }),
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.account.meta"))
    return {
      description: messages.description,
      title: messages.title,
    } satisfies AccountPageMeta
  },
  staticData: {
    namespaces: ["pages.account", "pages.account.meta", "pages.auth.errors", "pages.auth.validations"],
  },
})
