import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, redirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { getRouteNamespaces, messagesQueryOptions, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.utils"
const createLocaleRouter = () => {
  const root = createRootRouteWithContext<{
    queryClient: QueryClient
  }>()({
    beforeLoad: async ({ context, location, matches }) => {
      const locale = extractLocaleFromPath(location.pathname) ?? DEFAULT_LOCALE
      await preloadNamespaces({
        locale,
        namespaces: getRouteNamespaces(matches),
        queryClient: context.queryClient,
      })
      return {
        locale,
      }
    },
  })
  const localized = createRoute({
    getParentRoute: () => root,
    params: {
      stringify: (params) => ({
        locale: params.locale === DEFAULT_LOCALE ? undefined : params.locale,
      }),
    },
    path: "/{-$locale}",
  })
  const faq = createRoute({
    getParentRoute: () => localized,
    head: ({
      loaderData,
    }: Readonly<{
      loaderData?: Readonly<{ description: string; title: string }> | undefined
    }>) => ({
      meta: [
        {
          title: loaderData?.title,
        },
        {
          content: loaderData?.description,
          name: "description",
        },
      ],
    }),
    loader: ({ context }) => context.queryClient.query(messagesQueryOptions(context.locale, "pages.faq")),
    path: "/faq",
    staticData: {
      namespaces: ["pages.faq"],
    },
  })
  const signIn = createRoute({
    getParentRoute: () => localized,
    path: "/auth/sign-in",
  })
  const account = createRoute({
    beforeLoad: () => {
      throw redirect({
        to: "/{-$locale}/auth/sign-in",
      })
    },
    getParentRoute: () => localized,
    path: "/account",
  })
  return createRouter({
    context: {
      queryClient: new QueryClient(),
    },
    defaultStaleTime: 60_000,
    history: createMemoryHistory({
      initialEntries: ["/faq"],
    }),
    isServer: false,
    routeTree: root.addChildren([localized.addChildren([faq, signIn, account])]),
  })
}
vi.mock("@tanstack/router-core/isServer", () => ({
  isServer: false,
}))
describe("native optional locale routes", () => {
  it("refreshes FAQ metadata on locale navigation and inherits locale in links and redirects", async () => {
    vi.stubGlobal("window", {
      origin: "http://localhost",
    })
    try {
      const router = createLocaleRouter()
      await router.load()
      const polishData = router.state.matches.at(-1)?.loaderData
      router.history.push("/en/faq")
      await router.load({
        sync: true,
      })
      const englishData = router.state.matches.at(-1)?.loaderData
      expect({
        englishData,
        polishData,
      }).toMatchObject({
        englishData: {
          description: "Page under construction. We look forward to seeing you soon.",
          title: "FAQ",
        },
        polishData: {
          description: "Strona w budowie. Zapraszamy wkrótce.",
          title: "FAQ",
        },
      })
      expect(router.state.matches.at(-1)?.meta).toStrictEqual([
        {
          title: "FAQ",
        },
        {
          content: "Page under construction. We look forward to seeing you soon.",
          name: "description",
        },
      ])
      expect(
        router.buildLocation({
          to: "/{-$locale}/auth/sign-in",
        }).publicHref,
      ).toBe("/en/auth/sign-in")
      expect(
        router.buildLocation({
          params: {
            locale: "pl",
          },
          to: "/{-$locale}/faq",
        }).publicHref,
      ).toBe("/faq")
      router.history.push("/en/account")
      await router.load({
        sync: true,
      })
      expect(router.state.location.publicHref).toBe("/en/auth/sign-in")
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it("preserves query strings and hashes and emits canonical English and Polish roots", () => {
    vi.stubGlobal("window", {
      origin: "http://localhost",
    })
    try {
      const router = createLocaleRouter()
      expect(
        router.buildLocation({
          hash: "gold",
          params: {
            locale: "en",
          },
          search: () => ({
            category: "rings",
          }),
          to: "/{-$locale}/faq",
        }).publicHref,
      ).toBe("/en/faq?category=rings#gold")
      expect(
        router.buildLocation({
          hash: "gold",
          params: {
            locale: "pl",
          },
          search: () => ({
            category: "rings",
          }),
          to: "/{-$locale}/faq",
        }).publicHref,
      ).toBe("/faq?category=rings#gold")
      expect(
        router.buildLocation({
          params: {
            locale: "en",
          },
          to: "/{-$locale}",
        }).publicHref,
      ).toBe("/en")
      expect(
        router.buildLocation({
          params: {
            locale: "pl",
          },
          to: "/{-$locale}",
        }).publicHref,
      ).toBe("/")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
