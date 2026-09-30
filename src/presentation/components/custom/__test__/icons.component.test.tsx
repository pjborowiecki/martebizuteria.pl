import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { FacebookIcon, GithubIcon, GoogleIcon } from "~/src/presentation/components/custom/icons"

const svgOf = (container: HTMLElement): SVGSVGElement => {
  const icon = container.querySelector("svg")
  if (icon === null) {
    throw new Error("The icon rendered no svg")
  }

  return icon
}

afterEach(() => {
  cleanup()
})

describe("provider icons", () => {
  it.each([
    ["Google", <GoogleIcon key="google" />],
    ["Facebook", <FacebookIcon key="facebook" />],
    ["GitHub", <GithubIcon key="github" />],
  ])("names the %s icon for assistive technology", (title, element) => {
    renderWithProviders(element)

    expect(screen.getByTitle(title)).toBeInTheDocument()
  })

  it.each([[<GoogleIcon key="google" />], [<FacebookIcon key="facebook" />], [<GithubIcon key="github" />]])(
    "draws every icon on the same 24 unit canvas",
    (element) => {
      const { container } = renderWithProviders(element)

      expect(svgOf(container)).toHaveAttribute("viewBox", "0 0 24 24")
    },
  )

  it.each([[<FacebookIcon key="facebook" />], [<GithubIcon key="github" />]])(
    "tints the monochrome icon with the text colour",
    (element) => {
      const { container } = renderWithProviders(element)

      expect(svgOf(container)).toHaveAttribute("fill", "currentColor")
    },
  )

  it("keeps Google's brand colours instead of following the text colour", () => {
    const { container } = renderWithProviders(<GoogleIcon />)
    const icon = svgOf(container)

    expect(icon).not.toHaveAttribute("fill")
    expect([...icon.querySelectorAll("path")].map((path) => path.getAttribute("fill"))).toStrictEqual([
      "#4285F4",
      "#34A853",
      "#FBBC05",
      "#EA4335",
    ])
  })

  it("hides the Google icon from the accessibility tree, since the button carries the label", () => {
    const { container } = renderWithProviders(<GoogleIcon />)

    expect(svgOf(container)).toHaveAttribute("aria-hidden", "true")
  })

  it.each([[<GoogleIcon key="google" className="size-4" />], [<FacebookIcon key="facebook" className="size-4" />]])(
    "forwards svg props from the caller",
    (element) => {
      const { container } = renderWithProviders(element)

      expect(svgOf(container)).toHaveClass("size-4")
    },
  )

  it("lets the caller override the decorative default", () => {
    const { container } = renderWithProviders(<GoogleIcon aria-hidden={false} role="img" />)

    expect(svgOf(container)).toHaveAttribute("aria-hidden", "false")
  })
})
