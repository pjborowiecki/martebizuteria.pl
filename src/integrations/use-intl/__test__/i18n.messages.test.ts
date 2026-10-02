import { QueryClient } from "@tanstack/react-query"
import { type AbstractIntlMessages } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import {
  type NamespaceEntry,
  ROOT_NAMESPACES,
  buildMessageTree,
  getRouteNamespaces,
  isMessagesQuery,
  loadNamespace,
  messagesQueryOptions,
  preloadNamespaces,
  toNamespace,
} from "~/src/integrations/use-intl/i18n.messages"

import type commonMessages from "~/messages/en-US/common.json"

const messageKeys = (messages: AbstractIntlMessages, prefix = ""): string[] =>
  Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string" ? `${prefix}${key}` : messageKeys(value, `${prefix}${key}.`),
  )

const localeMessages = import.meta.glob<AbstractIntlMessages>("../../../../messages/*/*.json", {
  eager: true,
  import: "default",
})

describe("translation namespaces", () => {
  it.each(["en-US", "pl-PL"] as const)("loads every bundled %s namespace through the runtime loader", async (locale) => {
    const entries = Object.entries(localeMessages).filter(([path]) => path.includes(`/${locale}/`))

    await Promise.all(
      entries.map(async ([path, expected]) => {
        await expect(loadNamespace({ locale, namespace: toNamespace(path) })).resolves.toStrictEqual(expected)
      }),
    )
  })

  it.each(Object.entries(localeMessages).filter(([path]) => path.includes("/en-US/")))(
    "provides Polish messages for every key in %s",
    (path, english) => {
      const polish = localeMessages[path.replace("/en-US/", "/pl-PL/")]
      expect(polish).toBeDefined()
      expect(messageKeys(polish ?? {})).toStrictEqual(expect.arrayContaining(messageKeys(english)))
    },
  )

  it("merges parent and child files in either order without mutating cached JSON", () => {
    const parent = Object.freeze({
      products: Object.freeze({
        title: "Products",
      }),
      title: "Catalog",
    })

    const child = Object.freeze({
      catalogList: Object.freeze({
        title: "All products",
      }),
    })

    const entries: NamespaceEntry[] = [
      ["pages.admin.catalog", parent],
      ["pages.admin.catalog.products", child],
    ]

    const expected = {
      pages: {
        admin: {
          catalog: {
            products: {
              catalogList: {
                title: "All products",
              },
              title: "Products",
            },
            title: "Catalog",
          },
        },
      },
    }
    expect(buildMessageTree(entries)).toStrictEqual(expected)
    expect(buildMessageTree(entries.toReversed())).toStrictEqual(expected)
    expect(parent.products).toStrictEqual({
      title: "Products",
    })
    expect(child).toStrictEqual({
      catalogList: {
        title: "All products",
      },
    })
  })

  it("preloads only active route namespaces and keeps language caches separate", async () => {
    const queryClient = new QueryClient()
    const namespaces = getRouteNamespaces([
      {
        staticData: {},
      },
      {
        staticData: {
          namespaces: ["pages.cart"],
        },
      },
      {
        staticData: {
          namespaces: ["pages.cart", "pages.landing"],
        },
      },
    ])
    await preloadNamespaces({
      locale: "en-US",
      namespaces,
      queryClient,
    })
    await queryClient.query(messagesQueryOptions({ locale: "pl-PL", namespace: "common" }))

    const english = await loadNamespace<typeof commonMessages>({ locale: "en-US", namespace: "common" })
    const polish = await loadNamespace<typeof commonMessages>({ locale: "pl-PL", namespace: "common" })
    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey)
    expect(namespaces.filter((namespace) => namespace === "pages.cart")).toHaveLength(1)
    expect(keys).toStrictEqual([...namespaces.map((namespace) => ["messages", "en-US", namespace]), ["messages", "pl-PL", "common"]])
    expect(english.yes).toBe("Yes")
    expect(polish.yes).toBe("Tak")
  })

  it("removes inactive namespaces from the provider tree even when their queries remain cached", async () => {
    const queryClient = new QueryClient()
    await preloadNamespaces({
      locale: "en-US",
      namespaces: ["pages.admin", "pages.landing"],
      queryClient,
    })

    const namespaces = getRouteNamespaces([
      {
        staticData: {
          namespaces: ["pages.landing"],
        },
      },
    ])
    await preloadNamespaces({
      locale: "en-US",
      namespaces,
      queryClient,
    })

    const entries = await Promise.all(
      namespaces.map(async (namespace): Promise<NamespaceEntry> => [namespace, await loadNamespace({ locale: "en-US", namespace })]),
    )

    const tree = buildMessageTree(entries)
    expect(tree).toHaveProperty("pages.landing.meta.title")
    expect(tree).not.toHaveProperty("pages.admin")
    expect(queryClient.getQueryData(["messages", "en-US", "pages.admin"])).toBeDefined()
  })

  it("keeps email namespaces out of the root namespaces every route preloads", () => {
    expect(ROOT_NAMESPACES.some((namespace) => namespace.startsWith("emails"))).toBe(false)
    expect(ROOT_NAMESPACES).toContain("common")
    expect(ROOT_NAMESPACES.some((namespace) => namespace.startsWith("components."))).toBe(true)
  })

  it.each(["en-US", "pl-PL"] as const)("rejects an unknown %s namespace", (locale) => {
    expect(() => loadNamespace({ locale, namespace: "pages.does-not-exist" })).toThrow("Missing translation namespace")
  })
})

describe("isMessagesQuery", () => {
  it("recognises a message catalogue query", () => {
    expect(isMessagesQuery({ queryKey: messagesQueryOptions({ locale: "pl-PL", namespace: "common" }).queryKey })).toBe(true)
  })

  it("leaves every other query alone", () => {
    expect(isMessagesQuery({ queryKey: ["session", "current"] })).toBe(false)
  })
})
