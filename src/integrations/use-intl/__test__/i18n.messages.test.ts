import { QueryClient } from "@tanstack/react-query"
import { type AbstractIntlMessages } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import {
  type NamespaceEntry,
  buildMessageTree,
  getRouteNamespaces,
  loadNamespace,
  messagesQueryOptions,
  preloadNamespaces,
} from "~/src/integrations/use-intl/i18n.messages"
const messageKeys = (messages: AbstractIntlMessages, prefix = ""): string[] =>
  Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string" ? `${prefix}${key}` : messageKeys(value, `${prefix}${key}.`),
  )

const localeMessages = import.meta.glob<AbstractIntlMessages>("../../../../messages/*/*.json", {
  eager: true,
  import: "default",
})
describe("translation namespaces", () => {
  it.each(Object.entries(localeMessages).filter(([path]) => path.includes("/en/")))(
    "provides Polish messages for every key in %s",
    (path, english) => {
      const polish = localeMessages[path.replace("/en/", "/pl/")]
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
      locale: "en",
      namespaces,
      queryClient,
    })
    const english = await queryClient.query(messagesQueryOptions("en", "common"))
    const polish = await queryClient.query(messagesQueryOptions("pl", "common"))
    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey)
    expect(namespaces.filter((namespace) => namespace === "pages.cart")).toHaveLength(1)
    expect(keys).toStrictEqual([...namespaces.map((namespace) => ["messages", "en", namespace]), ["messages", "pl", "common"]])
    expect(english.yes).toBe("Yes")
    expect(polish.yes).toBe("Tak")
  })
  it("removes inactive namespaces from the provider tree even when their queries remain cached", async () => {
    const queryClient = new QueryClient()
    await preloadNamespaces({
      locale: "en",
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
      locale: "en",
      namespaces,
      queryClient,
    })
    const entries = await Promise.all(
      namespaces.map(async (namespace): Promise<NamespaceEntry> => [
        namespace,
        await queryClient.query(messagesQueryOptions("en", namespace)),
      ]),
    )
    const tree = buildMessageTree(entries)
    expect(tree).toHaveProperty("pages.landing.meta.title")
    expect(tree).not.toHaveProperty("pages.admin")
    expect(queryClient.getQueryData(["messages", "en", "pages.admin"])).toBeDefined()
  })
  it.each(["en", "pl"] as const)("keeps %s email namespaces outside the client loader", async (locale) => {
    // @ts-expect-error Server-only namespaces are excluded from the public loader.
    await expect(loadNamespace(locale, "emails")).rejects.toThrow("Missing translation namespace")
    // @ts-expect-error Auth email text is server-only too.
    await expect(loadNamespace(locale, "pages.auth.email")).rejects.toThrow("Missing translation namespace")
    const messages = getEmailMessages(locale)
    expect(messages.emails.orderConfirmation.subject).toBeTypeOf("string")
    expect(messages.pages.auth.email.verifyEmail.subject).toBeTypeOf("string")
    expect(Object.keys(messages.pages)).toStrictEqual(["auth"])
  })
})
