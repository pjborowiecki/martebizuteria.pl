import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PasswordToggle } from "~/src/presentation/components/custom/pages/auth/password-toggle"

afterEach(() => {
  cleanup()
})

describe("PasswordToggle", () => {
  it("offers to reveal the password while it is hidden", () => {
    renderWithProviders(<PasswordToggle show={false} onToggle={vi.fn<() => void>()} />)

    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument()
  })

  it("offers to hide the password while it is visible", () => {
    renderWithProviders(<PasswordToggle show onToggle={vi.fn<() => void>()} />)

    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument()
  })

  it("calls back once per click", async () => {
    const onToggle = vi.fn<() => void>()
    renderWithProviders(<PasswordToggle show={false} onToggle={onToggle} />)

    await userEvent.click(screen.getByRole("button", { name: "Show password" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("never submits the form it sits in", () => {
    renderWithProviders(<PasswordToggle show={false} onToggle={vi.fn<() => void>()} />)

    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("type", "button")
  })
})
