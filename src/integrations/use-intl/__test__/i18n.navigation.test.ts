import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, redirect } from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { getRouteNamespaces, messagesQueryOptions, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { deLocalizeUrl, getCurrentLocale, localizeUrl } from "~/src/integrations/use-intl/i18n.utils"

import type faqMessages from "~/messages/en-US/pages.faq.json"

const createLocaleRouter = () => {
  const root = createRootRouteWithContext<{
    queryClient: QueryClient
  }>()({
    beforeLoad: async ({ context, matches }) => {
      const locale = getCurrentLocale()

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

  const faq = createRoute({
    getParentRoute: () => root,
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
    loader: ({ context }) =>
      context.queryClient.query(messagesQueryOptions<typeof faqMessages>({ locale: context.locale, namespace: "pages.faq" })),
    path: "/faq",
    staticData: {
      namespaces: ["pages.faq"],
    },
  })

  const signIn = createRoute({
    getParentRoute: () => root,
    path: "/auth/sign-in",
  })

  const account = createRoute({
    beforeLoad: () => {
      throw redirect({
        to: "/auth/sign-in",
      })
    },
    getParentRoute: () => root,
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
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    routeTree: root.addChildren([faq, signIn, account]),
  })
}

const { currentRequest } = vi.hoisted(() => ({
  currentRequest: vi.fn<() => Request>(() => new Request("https://store.test/faq")),
}))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: currentRequest }))

describe("locale-free routes with router rewrite", () => {
  it("strips the locale before matching so a prefixed path resolves the same route", async () => {
    vi.stubGlobal("window", {
      origin: "http://localhost",
    })
    currentRequest.mockReturnValue(new Request("https://store.test/en-US/account"))

    try {
      const router = createLocaleRouter()

      router.history.push("/en-US/account")
      await router.load({
        sync: true,
      })

      expect(router.state.location.pathname).toBe("/auth/sign-in")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
