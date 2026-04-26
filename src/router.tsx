/* eslint-disable eslint-plugin-import/max-dependencies */
import type { JSX, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ThemesProvider } from "~/src/providers/themes-provider";

import { deLocalizeUrl, localizeUrl } from "~/src/lib/utils";

import { DefaultErrorComponent } from "./components/custom/default-error-component";
import { DefaultNotFoundComponent } from "./components/custom/default-not-found-component";
import { DefaultPendingComponent } from "./components/custom/default-pending-component";
import { routeTree } from "~/src/routeTree.gen";

const FIVE_MINS_IN_MS = 300_000;

function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: FIVE_MINS_IN_MS } }
  });

  return { queryClient };
}

export function getRouter() {
  const requestContext = getContext();

  const router = createRouter({
    InnerWrap: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <ThemesProvider>{children}</ThemesProvider>,
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
    defaultPreload: "intent",
    defaultPreloadDelay: 100,
    defaultPreloadIntentProximity: 1000,
    defaultPreloadStaleTime: 30_000,
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
