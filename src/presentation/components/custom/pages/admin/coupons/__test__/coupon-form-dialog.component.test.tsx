import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DISCOUNT_PERCENTAGE_MAX, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { CouponFormDialog } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-form-dialog"

const renderDialog = ({ coupon, isPending = false }: Readonly<{ coupon?: Discount["adminListItem"]; isPending?: boolean }> = {}) => {
  const onOpenChange = vi.fn<(open: boolean) => void>()
  const onSubmit = vi.fn<(values: Discount["adminFormValues"]) => void>()
  renderWithProviders(<CouponFormDialog coupon={coupon} isPending={isPending} onOpenChange={onOpenChange} onSubmit={onSubmit} open />)

  return { onOpenChange, onSubmit }
}

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const save = () => {
  fireEvent.click(screen.getByRole("button", { name: "Save coupon" }))
}

const submittedValues = async (onSubmit: ReturnType<typeof renderDialog>["onSubmit"]) => {
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  return onSubmit.mock.calls[0]?.[0]
}

const NEW_PERCENTAGE_COUPON: Discount["adminFormValues"] = {
  code: "WELCOME10",
  description: "",
  endsAt: undefined,
  isActive: true,
  maxDiscountAmount: undefined,
  minOrderTotal: undefined,
  perCustomerLimit: undefined,
  startsAt: undefined,
  type: DISCOUNT_TYPE.PERCENTAGE,
  usageLimit: undefined,
  value: 10,
}

const fillPercentageCoupon = () => {
  fill("Code", NEW_PERCENTAGE_COUPON.code)
  fill("Percent off", String(NEW_PERCENTAGE_COUPON.value))
}

afterEach(cleanup)

describe("CouponFormDialog for a new coupon", () => {
  it("introduces an empty percentage coupon that starts out active", () => {
    renderDialog()

    expect(screen.getByRole("heading", { name: "Create coupon" })).toBeInTheDocument()
    expect(screen.getByText("The code works at checkout as soon as it is active.")).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("")
    expect(screen.getByLabelText("Type")).toHaveValue(DISCOUNT_TYPE.PERCENTAGE)
    expect(screen.getByLabelText("Percent off")).toHaveAttribute("max", String(DISCOUNT_PERCENTAGE_MAX))
    expect(screen.getByLabelText("Maximum discount")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Active" })).toBeChecked()
  })

  it("offers every discount type in the type picker", () => {
    renderDialog()

    expect(screen.getByRole("option", { name: "Percentage" })).toHaveValue(DISCOUNT_TYPE.PERCENTAGE)
    expect(screen.getByRole("option", { name: "Fixed amount" })).toHaveValue(DISCOUNT_TYPE.FIXED_AMOUNT)
    expect(screen.getByRole("option", { name: "Free shipping" })).toHaveValue(DISCOUNT_TYPE.FREE_SHIPPING)
  })

  it("saves a percentage coupon with its blank limits and dates left out", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    save()

    expect(await submittedValues(onSubmit)).toStrictEqual(NEW_PERCENTAGE_COUPON)
  })

  it("saves the typed limits as numbers", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    fill("Maximum discount", "5000")
    fill("Minimum basket", "10000")
    fill("Total uses", "50")
    fill("Uses per customer", "2")
    save()

    expect(await submittedValues(onSubmit)).toStrictEqual({
      ...NEW_PERCENTAGE_COUPON,
      maxDiscountAmount: 5000,
      minOrderTotal: 10_000,
      perCustomerLimit: 2,
      usageLimit: 50,
    })
  })

  it("saves a coupon that starts out inactive once Active is unticked", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    fireEvent.click(screen.getByRole("checkbox", { name: "Active" }))

    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked()

    save()

    expect(await submittedValues(onSubmit)).toStrictEqual({ ...NEW_PERCENTAGE_COUPON, isActive: false })
  })

  it("saves the chosen start and end as timestamps of the admin's local time", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    fill("Starts", "2026-11-01T09:00")
    fill("Ends", "2026-11-30T23:00")
    save()

    expect(await submittedValues(onSubmit)).toStrictEqual({
      ...NEW_PERCENTAGE_COUPON,
      endsAt: new Date(2026, 10, 30, 23, 0).toISOString(),
      startsAt: new Date(2026, 10, 1, 9, 0).toISOString(),
    })
  })

  it("treats an end date past what a timestamp can hold as no end date", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    fill("Ends", "10000-01-01T00:00")
    save()

    expect(await submittedValues(onSubmit)).toStrictEqual(NEW_PERCENTAGE_COUPON)
  })
})

describe("CouponFormDialog validation", () => {
  it("explains a code that is too short in place of the hint and keeps the coupon unsaved", async () => {
    const { onSubmit } = renderDialog()
    fill("Code", "AB")
    fill("Percent off", "10")
    save()

    expect(await screen.findByText("Use at least 3 characters.")).toBeInTheDocument()
    expect(screen.queryByText("Letters, digits, hyphens and underscores.")).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("flags a percentage outside 1 to 100 as it is typed once a save has failed", async () => {
    const { onSubmit } = renderDialog()
    fill("Code", "AB")
    fill("Percent off", "10")
    save()
    await screen.findByText("Use at least 3 characters.")
    fill("Percent off", "150")

    expect(await screen.findByText("Enter a percentage between 1 and 100.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("refuses an end that comes before the start", async () => {
    const { onSubmit } = renderDialog()
    fillPercentageCoupon()
    fill("Starts", "2026-11-30T09:00")
    fill("Ends", "2026-11-01T09:00")
    save()

    expect(await screen.findByText("The end must come after the start.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe("CouponFormDialog for each discount type", () => {
  it("asks for an amount in grosze with no upper bound for a fixed amount coupon", () => {
    renderDialog()
    fill("Type", DISCOUNT_TYPE.FIXED_AMOUNT)

    expect(screen.getByLabelText("Amount off")).not.toHaveAttribute("max")
    expect(screen.getByText("Amounts are in grosze (100 gr = 1 zł).")).toBeInTheDocument()
    expect(screen.queryByLabelText("Percent off")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Maximum discount")).not.toBeInTheDocument()
  })

  it("flags a fixed amount of zero as it is typed once a save has failed", async () => {
    const { onSubmit } = renderDialog()
    fill("Code", "AB")
    fill("Type", DISCOUNT_TYPE.FIXED_AMOUNT)
    fill("Amount off", "1000")
    save()
    await screen.findByText("Use at least 3 characters.")
    fill("Amount off", "0")

    expect(await screen.findByText("Enter an amount above zero.")).toBeInTheDocument()
    expect(screen.queryByText("Amounts are in grosze (100 gr = 1 zł).")).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("keeps the grosze hint rather than a parser message when the amount is blank", async () => {
    const { onSubmit } = renderDialog()
    fill("Code", "TENOFF")
    fill("Type", DISCOUNT_TYPE.FIXED_AMOUNT)
    fill("Amount off", "")
    save()

    await waitFor(() => {
      expect(screen.getByLabelText("Amount off")).toHaveFocus()
    })
    expect(screen.getByText("Amounts are in grosze (100 gr = 1 zł).")).toBeInTheDocument()
    expect(screen.queryByText(/expected number/u)).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("drops the value field for free shipping and saves the coupon without one", async () => {
    const { onSubmit } = renderDialog()
    fill("Code", "SHIPFREE")
    fill("Type", DISCOUNT_TYPE.FREE_SHIPPING)

    expect(screen.getByText("Free shipping takes the whole delivery charge off, so it needs no value.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Percent off")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Amount off")).not.toBeInTheDocument()

    save()

    expect(await submittedValues(onSubmit)).toStrictEqual({
      ...NEW_PERCENTAGE_COUPON,
      code: "SHIPFREE",
      type: DISCOUNT_TYPE.FREE_SHIPPING,
      value: 0,
    })
  })
})

describe("CouponFormDialog for an existing coupon", () => {
  const openEndedCoupon = buildCoupon({
    endsAt: new Date(2026, 5, 30, 23, 59),
    minOrderTotalMinorUnits: undefined,
    perCustomerLimit: undefined,
    startsAt: new Date(2026, 5, 1, 9, 30),
    usageLimit: undefined,
  })

  it("titles the dialog for editing and fills every field from the coupon", () => {
    renderDialog({ coupon: buildCoupon({ endsAt: new Date(2026, 5, 30, 23, 59), maxDiscountAmountMinorUnits: 5000 }) })

    expect(screen.getByRole("heading", { name: "Edit coupon" })).toBeInTheDocument()
    expect(screen.getByText("Changes apply to checkouts started from now on.")).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("SPRING20")
    expect(screen.getByLabelText("Internal description")).toHaveValue("Spring campaign")
    expect(screen.getByLabelText("Percent off")).toHaveValue(20)
    expect(screen.getByLabelText("Maximum discount")).toHaveValue(5000)
    expect(screen.getByLabelText("Minimum basket")).toHaveValue(20_000)
    expect(screen.getByLabelText("Total uses")).toHaveValue(100)
    expect(screen.getByLabelText("Uses per customer")).toHaveValue(1)
    expect(screen.getByLabelText("Starts")).toHaveValue("")
    expect(screen.getByLabelText("Ends")).toHaveValue("2026-06-30T23:59")
  })

  it("leaves an inactive coupon unticked", () => {
    renderDialog({ coupon: buildCoupon({ isActive: false }) })

    expect(screen.getByRole("checkbox", { name: "Active" })).not.toBeChecked()
  })

  it("keeps the coupon's limits when it is saved untouched", async () => {
    const { onSubmit } = renderDialog({ coupon: buildCoupon({ maxDiscountAmountMinorUnits: 5000 }) })
    save()

    expect(await submittedValues(onSubmit)).toMatchObject({
      maxDiscountAmount: 5000,
      minOrderTotal: 20_000,
      perCustomerLimit: 1,
      usageLimit: 100,
    })
  })

  it("reactivates an inactive coupon once Active is ticked", async () => {
    const { onSubmit } = renderDialog({ coupon: buildCoupon({ isActive: false }) })
    fireEvent.click(screen.getByRole("checkbox", { name: "Active" }))
    save()

    expect(await submittedValues(onSubmit)).toMatchObject({ isActive: true })
  })

  it("deactivates an active coupon once Active is unticked", async () => {
    const { onSubmit } = renderDialog({ coupon: buildCoupon() })
    fireEvent.click(screen.getByRole("checkbox", { name: "Active" }))
    save()

    expect(await submittedValues(onSubmit)).toMatchObject({ isActive: false })
  })

  it("saves an untouched coupon with its dates as timestamps", async () => {
    const { onSubmit } = renderDialog({ coupon: openEndedCoupon })
    save()

    expect(await submittedValues(onSubmit)).toStrictEqual({
      code: "SPRING20",
      description: "Spring campaign",
      endsAt: new Date(2026, 5, 30, 23, 59).toISOString(),
      isActive: true,
      maxDiscountAmount: undefined,
      minOrderTotal: undefined,
      perCustomerLimit: undefined,
      startsAt: new Date(2026, 5, 1, 9, 30).toISOString(),
      type: DISCOUNT_TYPE.PERCENTAGE,
      usageLimit: undefined,
      value: 20,
    })
  })
})

describe("CouponFormDialog actions", () => {
  it("closes without saving when cancelled", () => {
    const { onOpenChange, onSubmit } = renderDialog()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows no progress indicator while idle", () => {
    renderDialog()

    expect(screen.getByRole("button", { name: "Save coupon" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Save coupon" }).querySelector("svg")).toBeNull()
  })

  it("locks both buttons and shows progress while a save is in flight", () => {
    renderDialog({ isPending: true })

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save coupon" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save coupon" }).querySelector("svg")).not.toBeNull()
  })
})
