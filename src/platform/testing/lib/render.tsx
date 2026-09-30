import { type ReactElement, type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterContextProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router"
import { type RenderOptions, render } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const createTestRouter = (path = "/") =>
  createRouter({ history: createMemoryHistory({ initialEntries: [path] }), routeTree: createRootRoute() })

const createTestQueryClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })

export const TestProviders = ({
  children,
  queryClient,
  router,
}: Readonly<{
  children: ReactNode
  queryClient: QueryClient
  router: ReturnType<typeof createTestRouter>
}>): ReactElement => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>{children}</RouterContextProvider>
    </QueryClientProvider>
  </IntlProvider>
)

export const renderWithProviders = (
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    router = createTestRouter(),
    ...options
  }: RenderOptions & {
    queryClient?: QueryClient
    router?: ReturnType<typeof createTestRouter>
  } = {},
) => ({
  ...render(
    <TestProviders queryClient={queryClient} router={router}>
      {ui}
    </TestProviders>,
    options,
  ),
  queryClient,
  router,
})
