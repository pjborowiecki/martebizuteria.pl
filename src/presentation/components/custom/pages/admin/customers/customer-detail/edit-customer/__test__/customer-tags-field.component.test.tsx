import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/modules/user/use-cases/update-customer", () => ({
  updateCustomerMutation: { mutationFn: vi.fn(), mutationKey: ["user", "update-customer"] },
}))

import { ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { CustomerFormProvider } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
import { CustomerTagsField } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-tags-field"

const JOINED_AT = new Date("2026-01-15T10:00:00.000Z")

const customerDetail = (overrides: Partial<User["adminCustomerDetail"]> = {}): User["adminCustomerDetail"] => ({
  averageOrderValue: 24_900,
  banExpires: null,
  banReason: null,
  banned: false,
  categoryBreakdown: [],
  createdAt: JOINED_AT,
  customTags: [],
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

const onDismiss = vi.fn<() => void>()

const onSuccess = vi.fn<() => void>()

const renderField = (customer: User["adminCustomerDetail"] = customerDetail()) =>
  renderWithProviders(
    <CustomerFormProvider customer={customer} onDismiss={onDismiss} onSuccess={onSuccess} open>
      <CustomerTagsField />
    </CustomerFormProvider>,
  )

const tagInput = () => screen.getByPlaceholderText("Add a tag…")

const tagNames = (): string[] =>
  screen
    .getAllByRole("button", { name: /^Remove tag/u })
    .map((button) => button.getAttribute("aria-label") ?? "")
    .map((label) => label.replace("Remove tag ", ""))

const NEARLY_FULL_TAGS = Array.from({ length: ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT - 1 }, (_, index) => `tag-${index}`)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("CustomerTagsField", () => {
  it("counts the tags a customer already carries against the limit", () => {
    renderField(customerDetail({ customTags: ["vip", "wholesale"] }))

    expect(screen.getByText(`2/${String(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT)}`)).toBeInTheDocument()
    expect(tagNames()).toStrictEqual(["vip", "wholesale"])
  })

  it("adds nothing for an entry made only of separators", async () => {
    renderField()

    await userEvent.type(tagInput(), ",;,{Enter}")

    expect(screen.queryAllByRole("button", { name: /^Remove tag/u })).toHaveLength(0)
    expect(tagInput()).toHaveValue(",;,")
  })

  it("stops at the limit and drops the tags that no longer fit", async () => {
    renderField(customerDetail({ customTags: NEARLY_FULL_TAGS }))

    await userEvent.type(tagInput(), "last-one; too-many{Enter}")

    expect(tagNames()).toStrictEqual([...NEARLY_FULL_TAGS, "last-one"])
    expect(tagInput()).toBeDisabled()
  })

  it("keeps the tag input open while there is still room", async () => {
    renderField(customerDetail({ customTags: NEARLY_FULL_TAGS }))

    expect(tagInput()).toBeEnabled()

    await userEvent.type(tagInput(), "last-one{Enter}")

    expect(screen.getByText(`${String(ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT)}/20`)).toBeInTheDocument()
  })
})
