import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"

import type * as SelectComponents from "~/src/presentation/components/shadcn/select"

import { type CouponFormInput } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"

const { formBridge } = vi.hoisted(() => ({ formBridge: { current: {} } }))

vi.mock("~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider", () => ({
  useCouponForm: () => formBridge.current,
}))
vi.mock("~/src/presentation/components/shadcn/select", async (importOriginal) => ({
  ...(await importOriginal<typeof SelectComponents>()),
  Select: ({ onValueChange }: Readonly<{ onValueChange: (value: string | null) => void }>): JSX.Element => (
    <button
      type="button"
      onClick={() => {
        onValueChange(null)
      }}
    >
      Emit empty selection
    </button>
  ),
}))

import { AvailabilitySection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/availability-section"
import { DiscountSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/_sections/discount-section"

const FormHarness = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const form = useForm<CouponFormInput>({ defaultValues: { code: "", isActive: false, type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 1500 } })
  formBridge.current = { clearErrors: form.clearErrors, control: form.control, isPending: false, setValue: form.setValue }

  return (
    <>
      {children}
      <output data-testid="active-value">{String(form.watch("isActive"))}</output>
      <output data-testid="type-value">{form.watch("type")}</output>
      <output data-testid="amount-value">{form.watch("value")}</output>
    </>
  )
}

afterEach(cleanup)

describe("coupon select nullable callback contract", () => {
  it("keeps the coupon's status when the select reports no selection", async () => {
    renderWithProviders(
      <FormHarness>
        <AvailabilitySection />
      </FormHarness>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("active-value")).toHaveTextContent("false")
  })

  it("keeps the coupon's type and value when the select reports no selection", async () => {
    renderWithProviders(
      <FormHarness>
        <DiscountSection />
      </FormHarness>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Emit empty selection" }))

    expect(screen.getByTestId("type-value")).toHaveTextContent(DISCOUNT_TYPE.FIXED_AMOUNT)
    expect(screen.getByTestId("amount-value")).toHaveTextContent("1500")
  })
})
