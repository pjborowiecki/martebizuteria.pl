import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vite-plus/test"

import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"

import type accountMessages from "~/messages/en-US/pages.account.json"

describe("accountPageMeta", () => {
  it.each([
    ["en-US", "Overview | M'Arte"],
    ["pl-PL", "Podsumowanie | M'Arte"],
  ] as const)("titles the %s account landing page after its sidebar entry", async (locale, title) => {
    await expect(accountPageMeta(new QueryClient(), locale, "overview")).resolves.toMatchObject({ title })
  })

  it.each([
    ["en-US", "Payment Methods | M'Arte"],
    ["pl-PL", "Metody płatności | M'Arte"],
  ] as const)("titles the %s payment page after the payment methods it lists", async (locale, title) => {
    await expect(accountPageMeta(new QueryClient(), locale, "payment")).resolves.toMatchObject({ title })
  })

  it.each(["en-US", "pl-PL"] as const)("names the %s sidebar link exactly like the payment page heading", async (locale) => {
    const messages = await loadNamespace<typeof accountMessages>({ locale, namespace: "pages.account" })

    expect(messages.sidebar.payment).toBe(messages.payment.title)
  })
})
