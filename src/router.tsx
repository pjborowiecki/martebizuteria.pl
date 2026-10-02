import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

import { clearCacheOnUserChange } from "~/src/integrations/better-auth/auth.session"
import { setupQueryClientInvalidationBroadcast } from "~/src/integrations/tanstack-query/query.sync"
import { deLocalizeUrl, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import { ImagePrefetchService } from "~/src/lib/image"

import { DefaultErrorComponent } from "~/src/presentation/components/custom/defaults/default-error-component"
import { DefaultNotFoundComponent } from "~/src/presentation/components/custom/defaults/default-not-found-component"
import { DefaultPendingComponent } from "~/src/presentation/components/custom/defaults/default-pending-component"

import { routeTree } from "~/src/routeTree.gen"

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: FIVE_MINS_IN_MS,
        staleTime: ONE_MIN_IN_MS,
      },
    },
  })

  const imagePrefetchService = new ImagePrefetchService()
  if (!import.meta.env.SSR) {
    setupQueryClientInvalidationBroadcast(queryClient)
    clearCacheOnUserChange(queryClient)
  }

  const router = createRouter({
    Wrap: ({
      children,
    }: Readonly<{
      children: ReactNode
    }>): JSX.Element => (
      <>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </>
    ),
    context: {
      imagePrefetchService,
      queryClient,
    },
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: DefaultNotFoundComponent,
    defaultPendingComponent: DefaultPendingComponent,
    defaultPendingMinMs: PENDING_MIN_DISPLAY_MS,
    defaultPendingMs: PENDING_SHOW_DELAY_MS,
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPreloadIntentProximity: 1000,
    defaultPreloadStaleTime: 0,
    defaultStaleTime: ONE_MIN_IN_MS,
    defaultStructuralSharing: true,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    routeTree,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant",
  })
  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  })

  return router
}

const ONE_MIN_IN_MS = 60_000

const FIVE_MINS_IN_MS = 300_000

const PENDING_SHOW_DELAY_MS = 200

const PENDING_MIN_DISPLAY_MS = 300
