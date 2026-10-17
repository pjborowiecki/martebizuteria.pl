import { act, cleanup, fireEvent, renderHook, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const calls = vi.hoisted(() => ({
  createDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
  onOpenChange: vi.fn<(open: boolean) => void>(),
  syncQueryInvalidation: vi.fn<(queryClient: object, queryKey: readonly string[]) => Promise<void>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
  updateDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: calls.syncQueryInvalidation }))
vi.mock("~/src/modules/discount/use-cases/create-discount", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { createDiscountMutation: { mutationFn: calls.createDiscount, mutationKey: DISCOUNT_MUTATION_KEYS.CREATE } }
})
vi.mock("~/src/modules/discount/use-cases/update-discount", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { updateDiscountMutation: { mutationFn: calls.updateDiscount, mutationKey: DISCOUNT_MUTATION_KEYS.UPDATE } }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_QUERY_KEYS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

import { DisplayPreferencesContext } from "~/src/hooks/use-display-format"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import { CouponSheet } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-sheet"

const renderSheet = (coupon?: Discount["adminListItem"]) =>
  renderWithProviders(
    <CouponSheet coupon={coupon} mode={coupon === undefined ? "create" : "edit"} onOpenChange={calls.onOpenChange} open />,
  )

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const choose = async (select: string, option: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: select }))
  const options = await screen.findAllByRole("option")
  const match = options.find((candidate) => candidate.textContent === option)
  if (match === undefined) {
    throw new Error(`${select} offered no ${option} option`)
  }

  await userEvent.click(match)
}

const createButton = () => screen.getByRole("button", { name: "Create coupon" })

const saveButton = () => screen.getByRole("button", { name: "Save coupon" })

const createdValues = async () => {
  await waitFor(() => {
    expect(calls.createDiscount).toHaveBeenCalledOnce()
  })

  return calls.createDiscount.mock.calls[0]?.[0]
}

const updatedInput = async () => {
  await waitFor(() => {
    expect(calls.updateDiscount).toHaveBeenCalledOnce()
  })

  return calls.updateDiscount.mock.calls[0]?.[0]
}

const fillPercentageCoupon = () => {
  fill("Code", "WELCOME10")
  fill("Percent off", "10")
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.createDiscount.mockResolvedValue({ code: "NEW10", ok: true })
  calls.updateDiscount.mockResolvedValue({ code: "SPRING20", ok: true })
  calls.syncQueryInvalidation.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  document.body.style.pointerEvents = ""
})

describe("CouponSheet for a new coupon", () => {
  it("introduces an empty percentage coupon that starts out active", () => {
    renderSheet()

    expect(screen.getByRole("heading", { name: "Create coupon" })).toBeInTheDocument()
    expect(screen.getByText("The code works at checkout as soon as it is active.")).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: "Type" })).toHaveTextContent("Percentage")
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Active")
    expect(screen.getByLabelText("Percent off")).toHaveValue("")
    expect(screen.getByLabelText("Maximum discount")).toHaveValue("")
    expect(screen.queryByText("ID")).not.toBeInTheDocument()
  })

  it("offers every discount type in the type picker", async () => {
    renderSheet()
    await userEvent.click(screen.getByRole("combobox", { name: "Type" }))
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["Percentage", "Fixed amount", "Free shipping"])
  })

  it("creates a percentage coupon with its blank limits and dates left out", async () => {
    renderSheet()
    fillPercentageCoupon()
    fireEvent.click(createButton())

    const input = await createdValues()

    expect(input).toMatchObject({
      values: { code: "WELCOME10", isActive: true, type: DISCOUNT_TYPE.PERCENTAGE, value: 10 },
    })
    expect(input).not.toHaveProperty("values.usageLimit", expect.anything())
    expect(input).not.toHaveProperty("values.startsAt", expect.anything())
    expect(input).not.toHaveProperty("values.endsAt", expect.anything())
  })

  it("saves money limits in grosze from the złoty the admin types", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Maximum discount", "50")
    fill("Minimum basket value", "100.50")
    fill("Total uses", "50")
    fill("Uses per customer", "2")
    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({
      values: { maxDiscountAmount: 5000, minOrderTotal: 10_050, perCustomerLimit: 2, usageLimit: 50 },
    })
  })

  it("forgets a limit that is cleared again", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Total uses", "50")
    fill("Total uses", "")
    fill("Minimum basket value", "100")
    fill("Minimum basket value", "")
    fireEvent.click(createButton())

    const input = await createdValues()

    expect(input).not.toHaveProperty("values.usageLimit", expect.anything())
    expect(input).not.toHaveProperty("values.minOrderTotal", expect.anything())
  })

  it("keeps a half-typed amount out of the coupon", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Minimum basket value", "12.")
    fireEvent.click(createButton())

    expect(await createdValues()).not.toHaveProperty("values.minOrderTotal", expect.anything())
  })

  it("saves a coupon that starts out disabled", async () => {
    renderSheet()
    fillPercentageCoupon()
    await choose("Status", "Disabled")

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Disabled")

    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({ values: { isActive: false } })
  })

  it("saves the chosen start and end as timestamps of the admin's display time zone", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Starts", "2026-11-01T09:00")
    fill("Ends", "2026-11-30T23:00")

    expect(screen.getByLabelText("Starts")).toHaveValue("2026-11-01T09:00")

    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({
      values: { endsAt: "2026-11-30T22:00:00.000Z", startsAt: "2026-11-01T08:00:00.000Z" },
    })
  })

  it("reads the start and end in a display time zone other than the shop's, on each side of its clock change", async () => {
    renderWithProviders(
      <DisplayPreferencesContext value={{ formatLocale: "en-US", timeZone: "America/New_York" }}>
        <CouponSheet coupon={undefined} mode="create" onOpenChange={calls.onOpenChange} open />
      </DisplayPreferencesContext>,
    )
    fillPercentageCoupon()
    fill("Starts", "2026-03-07T09:00")
    fill("Ends", "2026-03-09T09:00")

    expect(screen.getByLabelText("Ends")).toHaveValue("2026-03-09T09:00")

    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({
      values: { endsAt: "2026-03-09T13:00:00.000Z", startsAt: "2026-03-07T14:00:00.000Z" },
    })
  })

  it("confirms the new code, refreshes the coupon lists and closes", async () => {
    const { queryClient } = renderSheet()
    fillPercentageCoupon()
    fireEvent.click(createButton())

    await waitFor(() => {
      expect(calls.onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    })
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon created", { description: "NEW10 can be used at checkout now." })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  })
})

describe("CouponSheet validation", () => {
  it("explains a code that is too short and keeps the coupon unsaved", async () => {
    renderSheet()
    fill("Code", "AB")
    fill("Percent off", "10")
    fireEvent.click(createButton())

    expect(await screen.findByText("Use at least 3 characters.")).toBeInTheDocument()
    expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Fix the errors in the form", {
      description: "Check the highlighted fields and try again.",
    })
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("asks for a percentage when none is typed", async () => {
    renderSheet()
    fill("Code", "WELCOME10")
    fireEvent.click(createButton())

    expect(await screen.findByText("Enter a percentage between 1 and 100.")).toBeInTheDocument()
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("flags a percentage outside 1 to 100 as it is typed once a save has failed", async () => {
    renderSheet()
    fill("Code", "AB")
    fill("Percent off", "10")
    fireEvent.click(createButton())
    await screen.findByText("Use at least 3 characters.")
    fill("Percent off", "150")

    expect(await screen.findByText("Enter a percentage between 1 and 100.")).toBeInTheDocument()
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("refuses a limit of zero", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Total uses", "0")
    fireEvent.click(createButton())

    expect(await screen.findByText("Enter a number above zero.")).toBeInTheDocument()
    expect(screen.getByLabelText("Total uses")).toHaveValue("0")
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("refuses an end that comes before the start", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Starts", "2026-11-30T09:00")
    fill("Ends", "2026-11-01T09:00")
    fireEvent.click(createButton())

    expect(await screen.findByText("The end must come after the start.")).toBeInTheDocument()
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("treats a cleared date as no date", async () => {
    renderSheet()
    fillPercentageCoupon()
    fill("Ends", "2026-11-30T23:00")
    fill("Ends", "")
    fireEvent.click(createButton())

    expect(await createdValues()).not.toHaveProperty("values.endsAt", expect.anything())
  })
})

describe("CouponSheet for each discount type", () => {
  it("asks for an amount in złoty with no percentage cap for a fixed amount coupon", async () => {
    renderSheet()
    await choose("Type", "Fixed amount")

    expect(screen.getByLabelText("Amount off")).toHaveValue("")
    expect(screen.getAllByText("PLN").length).toBeGreaterThan(1)
    expect(screen.queryByLabelText("Percent off")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Maximum discount")).not.toBeInTheDocument()
  })

  it("saves a fixed amount in grosze", async () => {
    renderSheet()
    fill("Code", "TENOFF")
    await choose("Type", "Fixed amount")
    fill("Amount off", "15")
    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({ values: { code: "TENOFF", type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 1500 } })
  })

  it("drops a maximum discount typed for a percentage once the type changes", async () => {
    renderSheet()
    fill("Code", "TENOFF")
    fill("Maximum discount", "50")
    await choose("Type", "Fixed amount")
    fill("Amount off", "15")
    fireEvent.click(createButton())

    expect(await createdValues()).not.toHaveProperty("values.maxDiscountAmount", expect.anything())
  })

  it("saves a percentage coupon changed to a fixed amount without its maximum discount", async () => {
    renderSheet(buildCoupon({ maxDiscountAmountMinorUnits: 5000 }))
    await choose("Type", "Fixed amount")
    fill("Amount off", "15")
    fireEvent.click(saveButton())

    const input = await updatedInput()
    expect(input).toMatchObject({ values: { type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 1500 } })
    expect(input).not.toHaveProperty("values.maxDiscountAmount", expect.anything())
  })

  it("flags a fixed amount of zero as it is typed once a save has failed", async () => {
    renderSheet()
    fill("Code", "AB")
    await choose("Type", "Fixed amount")
    fill("Amount off", "10")
    fireEvent.click(createButton())
    await screen.findByText("Use at least 3 characters.")
    fill("Amount off", "0")

    expect(await screen.findByText("Enter an amount above zero.")).toBeInTheDocument()
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("starts the value afresh when the type changes", async () => {
    renderSheet()
    fill("Percent off", "20")
    await choose("Type", "Fixed amount")

    expect(screen.getByLabelText("Amount off")).toHaveValue("")
  })

  it("keeps the type when the same type is picked again", async () => {
    renderSheet()
    fill("Percent off", "20")
    await choose("Type", "Percentage")

    expect(screen.getByLabelText("Percent off")).toHaveValue("20")
  })

  it("drops the value field for free shipping and saves the coupon without one", async () => {
    renderSheet()
    fill("Code", "SHIPFREE")
    fill("Percent off", "20")
    await choose("Type", "Free shipping")

    expect(screen.getByText("Free shipping takes the whole delivery charge off, so it needs no value.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Percent off")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Amount off")).not.toBeInTheDocument()

    fireEvent.click(createButton())

    expect(await createdValues()).toMatchObject({ values: { code: "SHIPFREE", type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 } })
  })
})

describe("CouponSheet for an existing coupon", () => {
  it("titles the sheet for editing and fills every field from the coupon", () => {
    renderSheet(buildCoupon({ endsAt: new Date("2026-06-30T21:59:00.000Z"), maxDiscountAmountMinorUnits: 5000 }))

    expect(screen.getByRole("heading", { name: "Edit coupon" })).toBeInTheDocument()
    expect(screen.getByText("Changes apply to checkouts started from now on.")).toBeInTheDocument()
    expect(screen.getByDisplayValue("a1b2c3d4-0000-0000-0000-000000000001")).toHaveAttribute("readonly")
    expect(screen.getByLabelText("Code")).toHaveValue("SPRING20")
    expect(screen.getByLabelText("Internal description")).toHaveValue("Spring campaign")
    expect(screen.getByLabelText("Percent off")).toHaveValue("20")
    expect(screen.getByLabelText("Maximum discount")).toHaveValue("50.00")
    expect(screen.getByLabelText("Minimum basket value")).toHaveValue("200.00")
    expect(screen.getByLabelText("Total uses")).toHaveValue("100")
    expect(screen.getByLabelText("Uses per customer")).toHaveValue("1")
    expect(screen.getByLabelText("Starts")).toHaveValue("")
    expect(screen.getByLabelText("Ends")).toHaveValue("2026-06-30T23:59")
    expect(saveButton()).toBeEnabled()
  })

  it("shows the start and end in the admin's display time zone rather than the browser's", () => {
    renderWithProviders(
      <DisplayPreferencesContext value={{ formatLocale: "en-US", timeZone: "America/New_York" }}>
        <CouponSheet
          coupon={buildCoupon({ endsAt: new Date("2026-11-01T13:30:00.000Z"), startsAt: new Date("2026-10-31T13:30:00.000Z") })}
          mode="edit"
          onOpenChange={calls.onOpenChange}
          open
        />
      </DisplayPreferencesContext>,
    )

    expect(screen.getByLabelText("Starts")).toHaveValue("2026-10-31T09:30")
    expect(screen.getByLabelText("Ends")).toHaveValue("2026-11-01T08:30")
  })

  it("shows a disabled coupon as disabled", () => {
    renderSheet(buildCoupon({ isActive: false }))

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Disabled")
  })

  it("saves an untouched coupon under its id with its dates as timestamps", async () => {
    const coupon = buildCoupon({
      endsAt: new Date(2026, 5, 30, 23, 59),
      maxDiscountAmountMinorUnits: 5000,
      startsAt: new Date(2026, 5, 1, 9, 30),
    })
    renderSheet(coupon)
    fireEvent.click(saveButton())

    expect(await updatedInput()).toMatchObject({
      id: coupon.id,
      values: {
        code: "SPRING20",
        description: "Spring campaign",
        endsAt: new Date(2026, 5, 30, 23, 59).toISOString(),
        isActive: true,
        maxDiscountAmount: 5000,
        minOrderTotal: 20_000,
        perCustomerLimit: 1,
        startsAt: new Date(2026, 5, 1, 9, 30).toISOString(),
        type: DISCOUNT_TYPE.PERCENTAGE,
        usageLimit: 100,
        value: 20,
      },
    })
  })

  it("reactivates a disabled coupon", async () => {
    renderSheet(buildCoupon({ isActive: false }))
    await choose("Status", "Active")
    fireEvent.click(saveButton())

    expect(await updatedInput()).toMatchObject({ values: { isActive: true } })
  })

  it("confirms the update and closes", async () => {
    renderSheet(buildCoupon())
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(calls.onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    })
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon updated", { description: "SPRING20 has been saved." })
  })

  it("marks the code as taken and stays open when the server reports a conflict", async () => {
    calls.updateDiscount.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, DISCOUNT_ERROR_CODES.CODE_TAKEN))
    renderSheet(buildCoupon())
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Could not save the coupon", {
        description: "That code is already in use.",
      })
    })
    expect(within(screen.getByRole("dialog")).getByText("That code is already in use.")).toBeInTheDocument()
    expect(calls.onOpenChange).not.toHaveBeenCalled()
  })

  it("asks to try again when a save fails for any other reason", async () => {
    calls.updateDiscount.mockRejectedValue(new Error("database locked"))
    renderSheet(buildCoupon())
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Could not save the coupon", {
        description: "Please try again in a moment.",
      })
    })
    expect(calls.onOpenChange).not.toHaveBeenCalled()
  })
})

describe("CouponSheet actions", () => {
  it("closes without saving when cancelled", () => {
    renderSheet()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(calls.onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    expect(calls.createDiscount).not.toHaveBeenCalled()
  })

  it("shows no progress indicator while idle", () => {
    renderSheet()

    expect(createButton()).toBeEnabled()
    expect(createButton().querySelector("svg")).toBeNull()
  })

  it("locks both buttons and shows progress until the save finishes", async () => {
    const pending = Promise.withResolvers<{ code: string; ok: true }>()
    calls.updateDiscount.mockReturnValueOnce(pending.promise)
    renderSheet(buildCoupon())
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(saveButton()).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(saveButton().querySelector("svg")).not.toBeNull()
    expect(calls.onOpenChange).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve({ code: "SPRING20", ok: true })
      await pending.promise
    })

    await waitFor(() => {
      expect(calls.onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
    })
    expect(calls.updateDiscount).toHaveBeenCalledOnce()
  })
})

describe("useCouponForm", () => {
  it("refuses to run outside the coupon form", () => {
    expect(() => renderHook(() => useCouponForm())).toThrow("useCouponForm must be used within CouponFormProvider")
  })
})
