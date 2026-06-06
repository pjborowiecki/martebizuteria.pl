import type { JSX, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ImagePrefetchService } from "~/src/lib/_utils/image";
import { setupQueryClientInvalidationBroadcast } from "~/src/lib/_utils/query-client-sync";
import { deLocalizeUrl, localizeUrl } from "~/src/lib/utils";

import { DefaultErrorComponent } from "./components/custom/defaults/default-error-component";
import { DefaultNotFoundComponent } from "./components/custom/defaults/default-not-found-component";
import { DefaultPendingComponent } from "./components/custom/defaults/default-pending-component";
import { routeTree } from "~/src/routeTree.gen";

const ONE_MIN_IN_MS = 60_000;
const FIVE_MINS_IN_MS = 300_000;
const ROUTE_STALE_MS = 60_000;
const PENDING_SHOW_DELAY_MS = 3000;
const PENDING_MIN_DISPLAY_MS = 0;

function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: FIVE_MINS_IN_MS,
        staleTime: ONE_MIN_IN_MS
      }
    }
  });

  const imagePrefetchService = new ImagePrefetchService();

  if (!import.meta.env.SSR) {
    setupQueryClientInvalidationBroadcast(queryClient);
  }

  return { imagePrefetchService, queryClient };
}

export function getRouter() {
  const requestContext = getContext();

  const router = createRouter({
    Wrap: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
      <QueryClientProvider client={requestContext.queryClient}>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    ),
    context: { ...requestContext },
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: DefaultNotFoundComponent,
    defaultPendingComponent: DefaultPendingComponent,
    defaultPendingMinMs: PENDING_MIN_DISPLAY_MS,
    defaultPendingMs: PENDING_SHOW_DELAY_MS,
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPreloadIntentProximity: 1000,
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: ROUTE_STALE_MS,
    defaultStructuralSharing: true,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url)
    },
    routeTree,
    scrollRestoration: true,
    scrollRestorationBehavior: "instant"
  });

  setupRouterSsrQueryIntegration({ queryClient: requestContext.queryClient, router });

  return router;
}
