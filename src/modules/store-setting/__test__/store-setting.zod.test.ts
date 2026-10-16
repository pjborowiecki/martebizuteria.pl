import { describe, expect, it } from "vite-plus/test"

import { storeSettingZodSchemas } from "~/src/modules/store-setting/store-setting.zod"

const SELLER = {
  city: "Bochnia",
  countryCode: "PL",
  email: "kontakt@martebizuteria.pl",
  legalName: "Pyciak Mariusz Firma Jubilerska",
  nip: "8681772646",
  phone: "+48 663 150 820",
  postalCode: "32-700",
  regon: "384616568",
  street: "ul. Wąska 11",
}

const issuesFor = (input: Record<string, unknown>) => {
  const parsed = storeSettingZodSchemas.sellerDetails.safeParse({ ...SELLER, ...input })

  return parsed.success ? [] : parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])
}

describe("seller details", () => {
  it("accepts the shop's own details", () => {
    expect(storeSettingZodSchemas.sellerDetails.parse(SELLER)).toStrictEqual(SELLER)
  })

  it("trims every text and writes the NIP and REGON as bare digits", () => {
    expect(
      storeSettingZodSchemas.sellerDetails.parse({
        ...SELLER,
        city: " Bochnia ",
        email: " kontakt@martebizuteria.pl ",
        nip: "PL 868-177-26-46",
        regon: "384 616 568",
      }),
    ).toStrictEqual(SELLER)
  })

  it.each([
    ["legalName", "legalNameRequired"],
    ["street", "streetRequired"],
    ["postalCode", "postalCodeRequired"],
    ["city", "cityRequired"],
    ["nip", "nipRequired"],
    ["regon", "regonRequired"],
    ["email", "emailRequired"],
    ["phone", "phoneRequired"],
  ])("asks for the %s with one message when it is left blank", (field, message) => {
    expect(issuesFor({ [field]: "   " })).toStrictEqual([[field, message]])
  })

  it.each([
    ["legalName", 201, "legalNameTooLong"],
    ["street", 121, "streetTooLong"],
    ["postalCode", 13, "postalCodeTooLong"],
    ["city", 81, "cityTooLong"],
    ["phone", 31, "phoneTooLong"],
  ])("refuses a %s longer than %i characters", (field, length, message) => {
    expect(issuesFor({ [field]: "1".repeat(length) })).toStrictEqual([[field, message]])
  })

  it("refuses an email address longer than any mailbox can have", () => {
    expect(issuesFor({ email: `${"a".repeat(250)}@x.pl` })).toStrictEqual([["email", "emailTooLong"]])
  })

  it.each([
    ["nip", "8681772647", "nipInvalid"],
    ["regon", "384616569", "regonInvalid"],
    ["email", "kontakt-at-martebizuteria.pl", "emailInvalid"],
    ["phone", "663 150 820", "phoneInvalid"],
    ["phone", "+48 12", "phoneInvalid"],
    ["countryCode", "XX", "countryInvalid"],
  ])("refuses a %s of %j", (field, value, message) => {
    expect(issuesFor({ [field]: value })).toStrictEqual([[field, message]])
  })

  it("asks for a Polish postal code in the 00-000 form when the seller is in Poland", () => {
    expect(issuesFor({ postalCode: "32700" })).toStrictEqual([["postalCode", "postalCodeInvalid"]])
  })

  it("accepts a postal code in another country's own form", () => {
    expect(issuesFor({ city: "Berlin", countryCode: "DE", postalCode: "10115" })).toStrictEqual([])
  })

  it("checks the postal code even when another field is wrong, so the admin sees every mistake at once", () => {
    expect(issuesFor({ email: "", postalCode: "32700" })).toStrictEqual([
      ["email", "emailRequired"],
      ["postalCode", "postalCodeInvalid"],
    ])
  })

  it("leaves the postal code form alone while the postal code or the country is itself wrong", () => {
    expect(issuesFor({ postalCode: "" })).toStrictEqual([["postalCode", "postalCodeRequired"]])
    expect(issuesFor({ countryCode: "XX", postalCode: "32700" })).toStrictEqual([["countryCode", "countryInvalid"]])
  })

  it("asks for the time the admin's copy was loaded with an update", () => {
    expect(storeSettingZodSchemas.sellerDetailsUpdateInput.safeParse(SELLER).success).toBe(false)
    expect(
      storeSettingZodSchemas.sellerDetailsUpdateInput.parse({ ...SELLER, expectedUpdatedAt: new Date(0), postalCode: "32-700" }),
    ).toStrictEqual({ ...SELLER, expectedUpdatedAt: new Date(0) })
  })
})
