import { describe, expect, it } from "vite-plus/test"

import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod"

const VALID_SHIPPING: CheckoutFormSchema = {
  address1: "Krucza 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier-standard",
  email: "shopper@example.com",
  firstName: "Ada",
  lastName: "Kowalska",
  phone: "+48512345678",
  postalCode: "00-548",
}

const issuePaths = (values: CheckoutFormSchema): string[] => {
  const result = checkoutSchema.safeParse(values)
  if (result.success) {
    return []
  }

  return result.error.issues.map((issue) => issue.path.join("."))
}

const issueMessagesFor = (values: CheckoutFormSchema, path: string): string[] => {
  const result = checkoutSchema.safeParse(values)
  if (result.success) {
    return []
  }

  return result.error.issues.filter((issue) => issue.path.join(".") === path).map((issue) => issue.message)
}

describe("checkoutSchema shipping details", () => {
  it("accepts a complete Polish shipping address", () => {
    const result = checkoutSchema.safeParse(VALID_SHIPPING)

    expect(result.success).toBe(true)
  })

  it("defaults billing to the shipping address and does not opt into saving it", () => {
    const result = checkoutSchema.parse(VALID_SHIPPING)

    expect(result.sameAsShipping).toBe(true)
    expect(result.saveBillingAddress).toBe(false)
    expect(result.saveShippingAddress).toBe(false)
  })

  it.each([
    ["address1", "validation.addressRequired"],
    ["city", "validation.cityRequired"],
    ["countryCode", "validation.countryRequired"],
    ["firstName", "validation.firstNameRequired"],
    ["lastName", "validation.lastNameRequired"],
    ["postalCode", "validation.postCodeRequired"],
  ])("reports %s as required with a translation key", (field, message) => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, [field]: "" }, field)).toContain(message)
  })

  it("rejects a malformed email with a translation key", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, email: "shopper@" }, "email")).toStrictEqual(["validation.emailInvalid"])
  })

  it("requires a delivery method", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, deliveryMethod: "" }, "deliveryMethod")).toStrictEqual(["validation.deliveryRequired"])
  })
})

describe("checkoutSchema phone validation", () => {
  it("accepts a Polish mobile number without the country prefix", () => {
    expect(issuePaths({ ...VALID_SHIPPING, phone: "512345678" })).toStrictEqual([])
  })

  it("rejects a number that is not a mobile line", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, phone: "123" }, "phone")).toStrictEqual(["validation.phoneInvalid"])
  })

  it("reports an empty phone as both missing and unusable", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, phone: "" }, "phone")).toStrictEqual([
      "validation.phoneRequired",
      "validation.phoneInvalid",
    ])
  })

  it("rejects text that libphonenumber cannot read as a number", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, phone: "not-a-number" }, "phone")).toStrictEqual(["validation.phoneInvalid"])
  })
})

describe("checkoutSchema postal code format", () => {
  it("enforces the Polish two-three digit pattern", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, postalCode: "00548" }, "postalCode")).toStrictEqual(["validation.postCodeInvalid"])
  })

  it("ignores surrounding whitespace in the postal code", () => {
    expect(issuePaths({ ...VALID_SHIPPING, postalCode: " 00-548 " })).toStrictEqual([])
  })

  it("does not police the format of a billing country it has no pattern for", () => {
    expect(
      issuePaths({
        ...VALID_SHIPPING,
        billingAddress1: "Unter den Linden 1",
        billingCity: "Berlin",
        billingCountryCode: "DE",
        billingFirstName: "Jan",
        billingLastName: "Nowak",
        billingPostalCode: "10117",
        sameAsShipping: false,
      }),
    ).toStrictEqual([])
  })
})

describe("checkoutSchema destination country", () => {
  it("refuses to ship to a country the shop does not deliver to", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, countryCode: "DE", postalCode: "10115" }, "countryCode")).toStrictEqual([
      "validation.countryNotDelivered",
    ])
  })

  it("reports a missing country once, as required", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, countryCode: "" }, "countryCode")).toStrictEqual(["validation.countryRequired"])
  })
})

describe("checkoutSchema separate billing address", () => {
  it("requires every billing field once billing is not the shipping address", () => {
    expect(issuePaths({ ...VALID_SHIPPING, sameAsShipping: false })).toStrictEqual([
      "billingAddress1",
      "billingFirstName",
      "billingLastName",
      "billingCity",
      "billingCountryCode",
      "billingPostalCode",
    ])
  })

  it("accepts a complete separate billing address", () => {
    expect(
      issuePaths({
        ...VALID_SHIPPING,
        billingAddress1: "Marszalkowska 1",
        billingCity: "Warszawa",
        billingCountryCode: "PL",
        billingFirstName: "Jan",
        billingLastName: "Nowak",
        billingPostalCode: "00-001",
        sameAsShipping: false,
      }),
    ).toStrictEqual([])
  })

  it("validates the billing postal code against the billing country", () => {
    expect(
      issueMessagesFor(
        {
          ...VALID_SHIPPING,
          billingAddress1: "Marszalkowska 1",
          billingCity: "Warszawa",
          billingCountryCode: "PL",
          billingFirstName: "Jan",
          billingLastName: "Nowak",
          billingPostalCode: "00001",
          sameAsShipping: false,
        },
        "billingPostalCode",
      ),
    ).toStrictEqual(["validation.postCodeInvalid"])
  })

  it("leaves the billing fields alone while billing mirrors shipping", () => {
    expect(issuePaths({ ...VALID_SHIPPING, billingAddress1: "", sameAsShipping: true })).toStrictEqual([])
  })
})

describe("checkoutSchema company invoice", () => {
  const COMPANY = { billingCompanyName: "Pracownia Złotnicza sp. z o.o.", billingNip: "5260001246", companyInvoice: true }

  it("does not ask for a company unless the shopper wants an invoice for one", () => {
    expect(checkoutSchema.parse(VALID_SHIPPING).companyInvoice).toBe(false)
    expect(issuePaths({ ...VALID_SHIPPING, billingNip: "123" })).toStrictEqual([])
  })

  it("accepts a company with a NIP whose check digit matches", () => {
    expect(issuePaths({ ...VALID_SHIPPING, ...COMPANY })).toStrictEqual([])
  })

  it("requires the company name and the NIP once an invoice is asked for", () => {
    const values = { ...VALID_SHIPPING, billingCompanyName: "  ", billingNip: "", companyInvoice: true }

    expect(issueMessagesFor(values, "billingCompanyName")).toStrictEqual(["validation.companyNameRequired"])
    expect(issueMessagesFor(values, "billingNip")).toStrictEqual(["validation.nipRequired"])
    expect(issueMessagesFor({ ...VALID_SHIPPING, companyInvoice: true }, "billingNip")).toStrictEqual(["validation.nipRequired"])
  })

  it.each([
    ["a wrong check digit", "5260001245"],
    ["a check sum of ten, which no digit can match", "1234567890"],
    ["nine digits", "526000124"],
    ["eleven digits", "52600012460"],
    ["letters", "52600O1246"],
  ])("rejects a NIP with %s", (_case, billingNip) => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, ...COMPANY, billingNip }, "billingNip")).toStrictEqual(["validation.nipInvalid"])
  })

  it.each([["526-000-12-46"], ["526 000 12 46"], ["PL5260001246"], ["pl 526-00-01-246"], [" 5260001246 "]])(
    "reads %j as the ten digits of the NIP",
    (billingNip) => {
      expect(checkoutSchema.parse({ ...VALID_SHIPPING, ...COMPANY, billingNip }).billingNip).toBe("5260001246")
    },
  )

  it("trims the company name", () => {
    expect(checkoutSchema.parse({ ...VALID_SHIPPING, ...COMPANY, billingCompanyName: "  Pracownia  " }).billingCompanyName).toBe(
      "Pracownia",
    )
  })
})

describe("checkoutSchema locker delivery", () => {
  it("requires a locker id for a locker delivery method", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, deliveryMethodType: "locker" }, "lockerId")).toStrictEqual(["validation.lockerIdRequired"])
  })

  it("rejects a whitespace-only locker id", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, deliveryMethodType: "locker", lockerId: "   " }, "lockerId")).toStrictEqual([
      "validation.lockerIdRequired",
    ])
  })

  it("accepts a locker delivery with a locker chosen", () => {
    expect(issuePaths({ ...VALID_SHIPPING, deliveryMethodType: "locker", lockerId: "WAW01A" })).toStrictEqual([])
  })

  it("does not ask for a locker for a courier delivery", () => {
    expect(issuePaths({ ...VALID_SHIPPING, deliveryMethodType: "courier" })).toStrictEqual([])
  })
})

describe("checkout address storage limits", () => {
  it("accepts the optional second address line at its storage limit", () => {
    const address2 = "a".repeat(512)
    expect(checkoutSchema.parse({ ...VALID_SHIPPING, address2 }).address2).toBe(address2)
  })

  it("rejects a second address line that exceeds the storage limit", () => {
    const result = checkoutSchema.safeParse({ ...VALID_SHIPPING, address2: "a".repeat(513) })
    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "too_big", path: ["address2"] })]))
  })

  it("validates the Polish billing postal code when the billing country is missing", () => {
    expect(issueMessagesFor({ ...VALID_SHIPPING, billingPostalCode: "invalid", sameAsShipping: false }, "billingPostalCode")).toStrictEqual(
      ["validation.postCodeInvalid"],
    )
  })
})
