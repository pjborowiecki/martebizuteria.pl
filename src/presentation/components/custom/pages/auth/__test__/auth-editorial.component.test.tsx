import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  getBaseURL: () => "https://marte.test/",
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) =>
    pathOrUrl.startsWith("https://") ? pathOrUrl : `https://assets.test/${pathOrUrl.replace(/^\//u, "")}`,
}))

import { AuthEditorial } from "~/src/presentation/components/custom/pages/auth/auth-editorial"

const IMAGE_ALT = "Editorial jewelry composition on textured stone"

afterEach(() => {
  cleanup()
})

const renderAt = (path: string): HTMLElement => {
  renderWithProviders(<AuthEditorial />, { router: createTestRouter(path) })

  return screen.getByRole("img", { name: IMAGE_ALT })
}

describe("AuthEditorial", () => {
  it("renders the editorial quote and its attribution", () => {
    renderAt("/sign-in")

    expect(screen.getByText("Adornments as unique as the moments they celebrate.")).toBeInTheDocument()
    expect(screen.getByText("M'ARTE Atelier — Bochnia")).toBeInTheDocument()
  })

  it("shows the portrait hero image on the sign in route", () => {
    const image = renderAt("/sign-in")

    expect(image.getAttribute("srcset")).toContain("marketing/hero.webp")
    expect(image.style.maxWidth).toBe("1280px")
    expect(image.style.maxHeight).toBe("1600px")
  })

  it("swaps to the landscape about image on the sign up route", () => {
    const image = renderAt("/sign-up")

    expect(image.getAttribute("srcset")).toContain("marketing/about.webp")
    expect(image.style.maxWidth).toBe("1600px")
    expect(image.style.maxHeight).toBe("1100px")
  })

  it("loads the editorial image eagerly because it is above the fold", () => {
    expect(renderAt("/sign-in")).toHaveAttribute("loading", "eager")
  })

  it("asks the browser to decode the editorial image synchronously", () => {
    expect(renderAt("/sign-in")).toHaveAttribute("decoding", "sync")
  })
})
