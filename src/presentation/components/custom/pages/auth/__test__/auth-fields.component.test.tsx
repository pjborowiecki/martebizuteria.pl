import { type JSX, useEffect } from "react"

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AuthPasswordField, AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"

interface Values {
  email: string
  password: string
}

const Harness = ({ error, field }: Readonly<{ error?: string | undefined; field: "email" | "password" }>): JSX.Element => {
  const { control, setError } = useForm<Values>({ defaultValues: { email: "", password: "" } })
  useEffect(() => {
    if (error !== undefined) {
      setError(field, { message: error })
    }
  }, [error, field, setError])

  if (field === "password") {
    return <AuthPasswordField control={control} id="password" label="Password" name="password" required />
  }

  return <AuthTextField control={control} id="email" label="Email address" name="email" required />
}

afterEach(() => {
  cleanup()
})

describe("AuthTextField", () => {
  it("labels the input with its floating label", () => {
    renderWithProviders(<Harness field="email" />)

    expect(screen.getByLabelText(/Email address/u)).toBeInTheDocument()
  })

  it("marks a required field for assistive technology", () => {
    renderWithProviders(<Harness field="email" />)

    expect(screen.getByLabelText(/Email address/u)).toHaveAttribute("aria-required", "true")
  })

  it("records what the visitor types", async () => {
    renderWithProviders(<Harness field="email" />)

    await userEvent.type(screen.getByLabelText(/Email address/u), "ada@example.test")

    expect(screen.getByLabelText(/Email address/u)).toHaveValue("ada@example.test")
  })

  it("translates a validation key into an error message", () => {
    renderWithProviders(<Harness error="invalidEmail" field="email" />)

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
  })

  it("marks the input invalid once it carries an error", () => {
    renderWithProviders(<Harness error="invalidEmail" field="email" />)

    expect(screen.getByLabelText(/Email address/u)).toHaveAttribute("aria-invalid", "true")
  })

  it("confirms an address the browser autofills", async () => {
    const { container } = renderWithProviders(<Harness field="email" />)

    fireEvent.change(screen.getByLabelText(/Email address/u), { target: { value: "ada@example.test" } })

    await waitFor(() => {
      expect(container.querySelector("svg.text-success")).toBeInTheDocument()
    })
  })

  it("hides its error while the browser previews an autofill suggestion in it", async () => {
    renderWithProviders(<Harness error="invalidEmail" field="email" />)
    const error = await screen.findByRole("alert")

    expect(error).toHaveClass("group-has-autofill-preview/field:invisible")
    expect(error.closest("[data-slot=field]")).toContainElement(screen.getByLabelText(/Email address/u))
  })

  it("shows no error message while the field is untouched", () => {
    renderWithProviders(<Harness field="email" />)

    expect(screen.queryByText("Please enter a valid email address.")).not.toBeInTheDocument()
  })
})

describe("AuthPasswordField", () => {
  it("confirms a password the browser autofills", async () => {
    const { container } = renderWithProviders(<Harness field="password" />)

    fireEvent.change(screen.getByLabelText(/Password/u), { target: { value: "Saved-Password-1" } })

    await waitFor(() => {
      expect(container.querySelector("svg.text-success")).toBeInTheDocument()
    })
  })

  it("hides its error and puts back the usual border while the browser previews a saved password", async () => {
    renderWithProviders(<Harness error="passwordMinLength" field="password" />)
    const password = screen.getByLabelText(/Password/u)
    const error = await screen.findByRole("alert")

    expect(error).toHaveClass("group-has-autofill-preview/field:invisible")
    expect(error.closest("[data-slot=field]")).toContainElement(password)
    expect(password.closest("[data-slot=input-group]")).toHaveClass(
      "has-[[data-slot][aria-invalid=true]]:border-destructive",
      "has-[[data-slot][aria-invalid=true]]:has-autofill-preview:border-border",
      "has-[[data-slot][aria-invalid=true]]:has-autofill-preview:focus-within:border-foreground",
    )
  })

  it("masks the password by default", () => {
    renderWithProviders(<Harness field="password" />)

    expect(screen.getByLabelText(/Password/u)).toHaveAttribute("type", "password")
  })

  it("reveals the password when the toggle is pressed", async () => {
    renderWithProviders(<Harness field="password" />)

    await userEvent.click(screen.getByRole("button", { name: "Show password" }))

    expect(screen.getByLabelText(/Password/u)).toHaveAttribute("type", "text")
  })

  it("masks the password again on a second press", async () => {
    renderWithProviders(<Harness field="password" />)

    await userEvent.click(screen.getByRole("button", { name: "Show password" }))
    await userEvent.click(screen.getByRole("button", { name: "Hide password" }))

    expect(screen.getByLabelText(/Password/u)).toHaveAttribute("type", "password")
  })

  it("interpolates the minimum length into its validation message", () => {
    renderWithProviders(<Harness error="passwordMinLength" field="password" />)

    expect(screen.getByText("At least 8 characters long")).toBeInTheDocument()
  })
})
