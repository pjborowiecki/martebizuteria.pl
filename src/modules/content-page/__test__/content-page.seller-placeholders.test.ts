import { describe, expect, it } from "vite-plus/test"

import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import {
  SELLER_PLACEHOLDERS,
  findLocalesShowingSellerFields,
  findSellerPlaceholders,
  formatSellerPlaceholder,
  isSellerPlaceholder,
  removeSellerPlaceholders,
} from "~/src/modules/content-page/content-page.seller-placeholders"

describe("findSellerPlaceholders", () => {
  it("lists every store detail a body names, in order, known or not", () => {
    expect(findSellerPlaceholders(":seller[legalName]\\\n:seller[street], NIP :seller[nip] and :seller[iban]")).toStrictEqual([
      "legalName",
      "street",
      "nip",
      "iban",
    ])
  })

  it("leaves out an escaped placeholder, which the page shows as typed", () => {
    expect(findSellerPlaceholders(String.raw`\:seller[nip] is text`)).toStrictEqual([])
  })
})

describe("removeSellerPlaceholders", () => {
  it("takes the placeholders out and keeps the text around them", () => {
    expect(removeSellerPlaceholders("NIP :seller[nip], REGON :seller[regon]")).toBe("NIP , REGON ")
  })
})

describe("isSellerPlaceholder", () => {
  it("knows each store detail a page can show", () => {
    expect(SELLER_PLACEHOLDERS.every((placeholder) => isSellerPlaceholder(placeholder))).toBe(true)
    expect(isSellerPlaceholder("iban")).toBe(false)
    expect(isSellerPlaceholder("toString")).toBe(false)
  })
})

describe("formatSellerPlaceholder", () => {
  it.each([
    ["legalName", "Pracownia Testowa Anna Nowak"],
    ["street", "ul. Floriańska 1"],
    ["postalCode", "31-001"],
    ["city", "Kraków"],
    ["nip", "5260250274"],
    ["regon", "100000050"],
    ["email", "sklep@marte.test"],
    ["emailLink", "sklep@marte.test"],
    ["phone", "+48 600 100 200"],
    ["phoneLink", "+48 600 100 200"],
  ] as const)("writes %s as the stored value", (placeholder, value) => {
    expect(formatSellerPlaceholder(placeholder, TEST_SELLER_DETAILS, "en-US")).toBe(value)
  })

  it("names the country in the page's language", () => {
    expect(formatSellerPlaceholder("country", TEST_SELLER_DETAILS, "en-US")).toBe("Poland")
    expect(formatSellerPlaceholder("country", TEST_SELLER_DETAILS, "pl-PL")).toBe("Polska")
  })
})

describe("findLocalesShowingSellerFields", () => {
  const bodies = { "en-US": "Call :seller[phoneLink] or :seller[iban].", "pl-PL": "Adres: :seller[street], :seller[country]" }

  it("finds the languages whose page shows a changed detail, through any placeholder that writes it", () => {
    expect(findLocalesShowingSellerFields(bodies, ["phone"])).toStrictEqual(["en-US"])
    expect(findLocalesShowingSellerFields(bodies, ["countryCode", "street"])).toStrictEqual(["pl-PL"])
    expect(findLocalesShowingSellerFields(bodies, ["phone", "street"])).toStrictEqual(["pl-PL", "en-US"])
  })

  it("finds none when no page shows the changed details", () => {
    expect(findLocalesShowingSellerFields(bodies, ["nip", "email"])).toStrictEqual([])
  })
})
