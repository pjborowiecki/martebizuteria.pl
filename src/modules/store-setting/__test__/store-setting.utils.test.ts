import { describe, expect, it } from "vite-plus/test"

import { TEST_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import { formatSellerPostalAddress, toSellerPhoneHref } from "~/src/modules/store-setting/store-setting.utils"

describe("formatSellerPostalAddress", () => {
  it("writes the seller's name, street, postal code with city, and country in the reader's language", () => {
    expect(formatSellerPostalAddress(TEST_SELLER_DETAILS, "pl-PL")).toStrictEqual([
      "Pracownia Testowa Anna Nowak",
      "ul. Floriańska 1",
      "31-001 Kraków",
      "Polska",
    ])
    expect(formatSellerPostalAddress({ ...TEST_SELLER_DETAILS, countryCode: "DE" }, "en-US").at(-1)).toBe("Germany")
  })
})

describe("toSellerPhoneHref", () => {
  it.each([
    ["+48 600 100 200", "tel:+48600100200"],
    ["+48 (12) 345-67-89", "tel:+48123456789"],
  ])("dials %s without the spaces, dashes and brackets it is written with", (phone, href) => {
    expect(toSellerPhoneHref(phone)).toBe(href)
  })
})
