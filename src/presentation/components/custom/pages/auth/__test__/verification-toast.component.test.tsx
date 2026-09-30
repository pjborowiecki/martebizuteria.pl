import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { VerificationToast } from "~/src/presentation/components/custom/pages/auth/verification-toast"

const sonner = vi.hoisted(() => ({ success: vi.fn() }))

vi.mock("sonner", () => ({ toast: { success: sonner.success } }))

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
})

const visit = (search: string) => {
  globalThis.history.replaceState(undefined, "", `/account${search}`)
}

describe("VerificationToast", () => {
  it("confirms the verified email once the flag is present", () => {
    visit("?verified=true")

    renderWithProviders(<VerificationToast />)

    expect(sonner.success).toHaveBeenCalledWith("Email confirmed", {
      description: "Welcome to M'Arte — you're now signed in to your account.",
    })
  })

  it("strips the flag from the address bar so a reload stays quiet", () => {
    visit("?verified=true&ref=email")

    renderWithProviders(<VerificationToast />)

    expect(globalThis.location.search).toBe("?ref=email")
  })

  it("stays silent when the flag is absent", () => {
    visit("")

    renderWithProviders(<VerificationToast />)

    expect(sonner.success).not.toHaveBeenCalled()
  })

  it("stays silent for a flag that is not exactly true", () => {
    visit("?verified=1")

    renderWithProviders(<VerificationToast />)

    expect(sonner.success).not.toHaveBeenCalled()
    expect(globalThis.location.search).toBe("?verified=1")
  })

  it("renders no markup of its own", () => {
    visit("?verified=true")

    const { container } = renderWithProviders(<VerificationToast />)

    expect(container).toBeEmptyDOMElement()
  })
})
