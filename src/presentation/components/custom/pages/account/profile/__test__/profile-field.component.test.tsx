import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { ProfileField } from "~/src/presentation/components/custom/pages/account/profile/profile-field"
import { type EditableField } from "~/src/presentation/components/custom/pages/account/profile/profile-form.types"

interface HarnessProps {
  readonly editing: boolean
  readonly field: EditableField
  readonly onCancel: (field: EditableField) => void
  readonly onEdit: (field: EditableField) => void
  readonly onSave: (field: EditableField) => Promise<void>
  readonly values: CustomerAccount["profileForm"]
}

const Harness = ({ editing, field, onCancel, onEdit, onSave, values }: HarnessProps): JSX.Element => {
  const { control } = useForm<CustomerAccount["profileForm"]>({ defaultValues: values })

  return (
    <ProfileField
      control={control}
      editing={editing}
      field={field}
      label={field === "name" ? "Full name" : "Phone Number"}
      onCancel={onCancel}
      onEdit={onEdit}
      onSave={onSave}
      type={field === "phone" ? "tel" : "text"}
    />
  )
}

const renderField = (overrides: Partial<HarnessProps> = {}) => {
  const handlers = {
    onCancel: vi.fn<(field: EditableField) => void>(),
    onEdit: vi.fn<(field: EditableField) => void>(),
    onSave: vi.fn<(field: EditableField) => Promise<void>>(() => Promise.resolve()),
  }

  renderWithProviders(
    <Harness editing={false} field="name" values={{ name: "Anna Kowalska", phone: "+48123456789" }} {...handlers} {...overrides} />,
  )

  return handlers
}

describe("ProfileField", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the label and the current form value", () => {
    renderField()

    expect(screen.getByText("Full name")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveValue("Anna Kowalska")
  })

  it("keeps the value read only until editing starts", () => {
    renderField()

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly")
  })

  it("offers a single action while the field is idle", async () => {
    const handlers = renderField()

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(1)

    await userEvent.click(buttons[0]!)

    expect(handlers.onEdit).toHaveBeenCalledWith("name")
  })

  it("offers saving and cancelling once editing starts", () => {
    renderField({ editing: true })

    expect(screen.getAllByRole("button")).toHaveLength(2)
    expect(screen.getByRole("textbox")).not.toHaveAttribute("readonly")
  })

  it("saves the field the shopper was editing", async () => {
    const handlers = renderField({ editing: true })

    await userEvent.click(screen.getAllByRole("button")[0]!)

    expect(handlers.onSave).toHaveBeenCalledWith("name")
    expect(handlers.onCancel).not.toHaveBeenCalled()
  })

  it("abandons the edit when cancelled", async () => {
    const handlers = renderField({ editing: true })

    await userEvent.click(screen.getAllByRole("button")[1]!)

    expect(handlers.onCancel).toHaveBeenCalledWith("name")
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it("accepts typing while editing", async () => {
    renderField({ editing: true })
    const input = screen.getByRole("textbox")

    await userEvent.clear(input)
    await userEvent.type(input, "Anna Nowak")

    expect(input).toHaveValue("Anna Nowak")
  })

  it("edits the phone field through its own name", async () => {
    const handlers = renderField({ field: "phone" })

    expect(screen.getByRole("textbox")).toHaveValue("+48123456789")

    await userEvent.click(screen.getAllByRole("button")[0]!)

    expect(handlers.onEdit).toHaveBeenCalledWith("phone")
  })
})
