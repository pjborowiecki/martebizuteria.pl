import { describe, expect, it } from "vite-plus/test"

import { type User } from "~/src/modules/user/user.types"

import {
  createDefaultCustomerFormValues,
  customerToFormValues,
} from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form.utils"

const JOINED_AT = new Date("2026-01-15T10:00:00.000Z")

const customerDetail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
  addressForm: { address1: "ul. Mokotowska 12/4", city: "Warszawa", countryCode: "PL", postalCode: "00-640" },
  averageOrderValue: 24_900,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: JOINED_AT,
  customTags: ["vip", "wholesale"],
  email: "anna@example.com",
  emailVerified: true,
  id: "usr_1",
  image: null,
  initials: "AK",
  isAnonymous: false,
  isReturning: true,
  joinDate: "15 Jan 2026",
  metadata: null,
  monthlySpending: [],
  name: "Anna Kowalska",
  notes: "Prefers pickup at the atelier.",
  orderCount: 3,
  orders: [],
  phone: "+48600123456",
  returningRate: 0.5,
  role: "customer",
  roleBadgeKey: "roleCustomer",
  stripeCustomerId: null,
  tags: [],
  timeline: [],
  timezone: null,
  totalSpent: 74_700,
  twoFactorEnabled: false,
  updatedAt: JOINED_AT,
  ...overrides,
})

describe("customerToFormValues", () => {
  it("carries the saved address, tags, notes and phone into the form", () => {
    expect(customerToFormValues(customerDetail())).toStrictEqual({
      address: { address1: "ul. Mokotowska 12/4", city: "Warszawa", countryCode: "PL", postalCode: "00-640" },
      customTags: ["vip", "wholesale"],
      notes: "Prefers pickup at the atelier.",
      phone: "+48600123456",
    })
  })

  it("falls back to an empty address when the customer has none on file", () => {
    expect(customerToFormValues(customerDetail({ addressForm: undefined })).address).toStrictEqual({
      address1: "",
      city: "",
      countryCode: "",
    })
  })

  it("turns missing notes and phone into empty strings the inputs can bind to", () => {
    const values = customerToFormValues(customerDetail({ notes: undefined, phone: null }))

    expect(values.notes).toBe("")
    expect(values.phone).toBe("")
  })

  it("copies the tags so editing the form cannot mutate the loaded customer", () => {
    const customer = customerDetail()
    const values = customerToFormValues(customer)

    values.customTags.push("new-tag")

    expect(customer.customTags).toStrictEqual(["vip", "wholesale"])
  })

  it("keeps the loaded address object rather than cloning it field by field", () => {
    const customer = customerDetail()

    expect(customerToFormValues(customer).address).toBe(customer.addressForm)
  })
})

describe("createDefaultCustomerFormValues", () => {
  it("starts from a blank form with no tags", () => {
    expect(createDefaultCustomerFormValues()).toStrictEqual({
      address: { address1: "", city: "", countryCode: "" },
      customTags: [],
      notes: "",
      phone: "",
    })
  })

  it("returns a fresh address each call so two forms cannot share state", () => {
    const first = createDefaultCustomerFormValues()
    const second = createDefaultCustomerFormValues()

    expect(first.address).not.toBe(second.address)
    expect(first.customTags).not.toBe(second.customTags)
  })
})
