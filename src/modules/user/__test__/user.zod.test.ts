import { describe, expect, it } from "vite-plus/test"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_DETAIL_TAGS, ADMIN_CUSTOMER_FORM_FIELD_MAX, ADMIN_CUSTOMER_STAT_FILTER } from "~/src/modules/user/user.constants"
import { userZodSchemas } from "~/src/modules/user/user.zod"

describe("adminCustomerAddressForm", () => {
  it("accepts an address the admin filled in", () => {
    const parsed = userZodSchemas.adminCustomerAddressForm.parse({
      address1: "Krucza 12/4",
      city: "Warszawa",
      countryCode: "PL",
      postalCode: "00-548",
      province: "Mazowieckie",
    })

    expect(parsed).toStrictEqual({
      address1: "Krucza 12/4",
      city: "Warszawa",
      countryCode: "PL",
      postalCode: "00-548",
      province: "Mazowieckie",
    })
  })

  it("accepts a blank country so the admin can clear it", () => {
    expect(userZodSchemas.adminCustomerAddressForm.safeParse({ address1: "", city: "", countryCode: "" }).success).toBe(true)
  })

  it("refuses a country code that is not exactly two characters", () => {
    expect(userZodSchemas.adminCustomerAddressForm.safeParse({ address1: "", city: "", countryCode: "POL" }).success).toBe(false)
    expect(userZodSchemas.adminCustomerAddressForm.safeParse({ address1: "", city: "", countryCode: "P" }).success).toBe(false)
  })

  it("caps the street line at the column width", () => {
    const base = { city: "Warszawa", countryCode: "PL" }

    expect(
      userZodSchemas.adminCustomerAddressForm.safeParse({ ...base, address1: "x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE) })
        .success,
    ).toBe(true)
    expect(
      userZodSchemas.adminCustomerAddressForm.safeParse({ ...base, address1: "x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.ADDRESS_LINE + 1) })
        .success,
    ).toBe(false)
  })

  it("caps the city at the column width", () => {
    const base = { address1: "Krucza 12/4", countryCode: "PL" }

    expect(
      userZodSchemas.adminCustomerAddressForm.safeParse({ ...base, city: "x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY) }).success,
    ).toBe(true)
    expect(
      userZodSchemas.adminCustomerAddressForm.safeParse({ ...base, city: "x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.CITY + 1) }).success,
    ).toBe(false)
  })
})

describe("adminCustomerFormValues", () => {
  it("accepts notes, tags and a phone number", () => {
    const parsed = userZodSchemas.adminCustomerFormValues.parse({
      customTags: ["vip", "wholesale"],
      notes: "Prefers courier delivery",
      phone: "+48512345678",
    })

    expect(parsed.customTags).toStrictEqual(["vip", "wholesale"])
    expect(parsed.notes).toBe("Prefers courier delivery")
  })

  it("requires the tag list even when it is empty", () => {
    expect(userZodSchemas.adminCustomerFormValues.safeParse({}).success).toBe(false)
    expect(userZodSchemas.adminCustomerFormValues.safeParse({ customTags: [] }).success).toBe(true)
  })

  it("caps how many tags one customer can carry", () => {
    const atLimit = Array.from({ length: ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT }, (_value, index) => `tag-${String(index)}`)

    expect(userZodSchemas.adminCustomerFormValues.safeParse({ customTags: atLimit }).success).toBe(true)
    expect(userZodSchemas.adminCustomerFormValues.safeParse({ customTags: [...atLimit, "one-too-many"] }).success).toBe(false)
  })

  it("caps the length of a single tag", () => {
    expect(
      userZodSchemas.adminCustomerFormValues.safeParse({ customTags: ["x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAG + 1)] }).success,
    ).toBe(false)
  })

  it("caps the notes and the phone number", () => {
    expect(
      userZodSchemas.adminCustomerFormValues.safeParse({ customTags: [], notes: "x".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.NOTES + 1) })
        .success,
    ).toBe(false)
    expect(
      userZodSchemas.adminCustomerFormValues.safeParse({ customTags: [], phone: "9".repeat(ADMIN_CUSTOMER_FORM_FIELD_MAX.PHONE + 1) })
        .success,
    ).toBe(false)
  })

  it("nests the address form so an admin can edit both at once", () => {
    expect(
      userZodSchemas.adminCustomerFormValues.safeParse({
        address: { address1: "Krucza 12/4", city: "Warszawa", countryCode: "PL" },
        customTags: [],
      }).success,
    ).toBe(true)
    expect(
      userZodSchemas.adminCustomerFormValues.safeParse({
        address: { address1: "Krucza 12/4", city: "Warszawa", countryCode: "POL" },
        customTags: [],
      }).success,
    ).toBe(false)
  })
})

describe("updateAdminCustomerInput and deleteCustomerInput", () => {
  it("requires a customer id to update", () => {
    expect(userZodSchemas.updateAdminCustomerInput.safeParse({ id: "", values: { customTags: [] } }).success).toBe(false)
    expect(userZodSchemas.updateAdminCustomerInput.safeParse({ id: "usr_1", values: { customTags: [] } }).success).toBe(true)
  })

  it("requires a non-empty user id to delete", () => {
    expect(userZodSchemas.deleteCustomerInput.safeParse({ userId: "" }).success).toBe(false)
    expect(userZodSchemas.deleteCustomerInput.parse({ userId: "usr_1" })).toStrictEqual({ userId: "usr_1" })
  })
})

describe("adminCustomerDetailInput", () => {
  it("requires an id and leaves the locale optional", () => {
    expect(userZodSchemas.adminCustomerDetailInput.parse({ id: "usr_1" })).toStrictEqual({ id: "usr_1" })
    expect(userZodSchemas.adminCustomerDetailInput.safeParse({ id: "" }).success).toBe(false)
  })

  it("carries the locale through when one is supplied", () => {
    expect(userZodSchemas.adminCustomerDetailInput.parse({ id: "usr_1", locale: "pl-PL" }).locale).toBe("pl-PL")
  })
})

describe("adminCustomersPageInput", () => {
  it("accepts the filters the customers table exposes", () => {
    const parsed = userZodSchemas.adminCustomersPageInput.parse({
      banned: false,
      emailVerified: true,
      page: 2,
      pageSize: 25,
      role: ROLES.ADMIN,
      search: "kowalska",
      statFilter: ADMIN_CUSTOMER_STAT_FILTER.RETURNING,
    })

    expect(parsed.page).toBe(2)
    expect(parsed.role).toBe(ROLES.ADMIN)
    expect(parsed.statFilter).toBe(ADMIN_CUSTOMER_STAT_FILTER.RETURNING)
  })

  it("accepts no filters at all for the unfiltered first page", () => {
    expect(userZodSchemas.adminCustomersPageInput.parse({})).toStrictEqual({})
  })

  it("refuses a role the access model does not define", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ role: "superuser" }).success).toBe(false)
  })

  it("refuses a stat filter the stats cards cannot produce", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ statFilter: "churned" }).success).toBe(false)
  })

  it("refuses a page number below the first page", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ page: 0 }).success).toBe(false)
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ page: 1.5 }).success).toBe(false)
  })

  it("refuses an empty page", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ pageSize: 0 }).success).toBe(false)
  })

  it("accepts a numeric filter on total spent and rejects a bare number", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ totalSpent: { amountMinorUnits: 1000, operator: "gte" } }).success).toBe(true)
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ totalSpent: 1000 }).success).toBe(false)
  })

  it("requires both ends of a between filter on average order value", () => {
    expect(
      userZodSchemas.adminCustomersPageInput.safeParse({
        averageOrderValue: { endAmountMinorUnits: 5000, operator: "between", startAmountMinorUnits: 1000 },
      }).success,
    ).toBe(true)
    expect(
      userZodSchemas.adminCustomersPageInput.safeParse({ averageOrderValue: { operator: "between", startAmountMinorUnits: 1000 } }).success,
    ).toBe(false)
  })

  it("accepts a date filter on the last order and rejects an unknown operator", () => {
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ lastOrderAt: { date: "2026-01-01", operator: "on" } }).success).toBe(true)
    expect(userZodSchemas.adminCustomersPageInput.safeParse({ lastOrderAt: { date: "2026-01-01", operator: "around" } }).success).toBe(
      false,
    )
  })

  it("shares its filter shape with the export input, which has no paging", () => {
    expect(userZodSchemas.adminCustomersExportInput.parse({ banned: true, page: 3 })).toStrictEqual({ banned: true })
  })
})

describe("adminCustomerDetailTimelineEvent", () => {
  it("accepts every event kind the detail page renders", () => {
    const events = [
      { date: "1 Jan 2026", kind: "account_created" },
      { date: "2 Jan 2026", kind: "order_placed", orderId: "ord_1", total: "199,00 zl" },
      { date: "3 Jan 2026", kind: "signed_in" },
      { date: "3 Jan 2026", kind: "signed_out" },
      { date: "4 Jan 2026", kind: "cart_item_added", productTitle: "Linen shirt", quantity: 2 },
      { date: "5 Jan 2026", itemCount: 3, kind: "cart_abandoned" },
      { date: "6 Jan 2026", kind: "page_viewed", path: "/products" },
    ]

    for (const event of events) {
      expect(userZodSchemas.adminCustomerDetailTimelineEvent.safeParse(event).success).toBe(true)
    }
  })

  it("lets a cart addition omit the quantity", () => {
    expect(
      userZodSchemas.adminCustomerDetailTimelineEvent.parse({ date: "4 Jan 2026", kind: "cart_item_added", productTitle: "Linen shirt" }),
    ).toStrictEqual({ date: "4 Jan 2026", kind: "cart_item_added", productTitle: "Linen shirt" })
  })

  it("requires the fields that belong to the matched kind", () => {
    expect(userZodSchemas.adminCustomerDetailTimelineEvent.safeParse({ date: "2 Jan 2026", kind: "order_placed" }).success).toBe(false)
    expect(userZodSchemas.adminCustomerDetailTimelineEvent.safeParse({ date: "5 Jan 2026", kind: "cart_abandoned" }).success).toBe(false)
  })

  it("refuses an event kind the timeline does not know", () => {
    expect(userZodSchemas.adminCustomerDetailTimelineEvent.safeParse({ date: "7 Jan 2026", kind: "refunded" }).success).toBe(false)
  })
})

describe("adminCustomerStats", () => {
  it("requires all four aggregate numbers", () => {
    expect(
      userZodSchemas.adminCustomerStats.parse({ averageLtv: 19_900, averageProductsPerOrder: 2.4, returningRate: 38, total: 120 }),
    ).toStrictEqual({ averageLtv: 19_900, averageProductsPerOrder: 2.4, returningRate: 38, total: 120 })
    expect(userZodSchemas.adminCustomerStats.safeParse({ averageLtv: 19_900, returningRate: 38, total: 120 }).success).toBe(false)
  })
})

describe("adminCustomerDetail", () => {
  it("only accepts the detail tags the badge row can render", () => {
    const { tags } = userZodSchemas.adminCustomerDetail.shape

    expect(tags.safeParse(Object.values(ADMIN_CUSTOMER_DETAIL_TAGS)).success).toBe(true)
    expect(tags.safeParse(["churned"]).success).toBe(false)
  })

  it("only accepts the role badge keys the customers messages define", () => {
    const { roleBadgeKey } = userZodSchemas.adminCustomerDetail.shape

    expect(roleBadgeKey.safeParse("roleAdmin").success).toBe(true)
    expect(roleBadgeKey.safeParse("returning").success).toBe(true)
    expect(roleBadgeKey.safeParse("roleGuest").success).toBe(false)
  })
})
