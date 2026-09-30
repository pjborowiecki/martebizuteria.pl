import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/_storefront.about"

const AboutPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the about route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("storefront about page", () => {
  it("titles the page after the atelier", () => {
    renderWithProviders(<AboutPage />)

    expect(screen.getByRole("heading", { level: 1, name: "About M'Arte" })).toBeInTheDocument()
    expect(screen.getByText("About the brand")).toBeInTheDocument()
  })

  it("opens with where the jewellery is made and how long the workshop has worked", () => {
    renderWithProviders(<AboutPage />)

    expect(
      screen.getByText("M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978."),
    ).toBeInTheDocument()
  })

  it("tells the whole brand story rather than announcing an unfinished page", () => {
    renderWithProviders(<AboutPage />)

    expect(screen.getByText(/We make forms in silver and gold/u)).toBeInTheDocument()
    expect(screen.getByText(/For us jewellery is more than an accessory/u)).toBeInTheDocument()
    expect(screen.getByText(/We like simple forms, the imperfections of natural materials/u)).toBeInTheDocument()
    expect(screen.getByText(/we make bespoke jewellery to order as well/u)).toBeInTheDocument()
    expect(screen.queryByText(/under construction/iu)).not.toBeInTheDocument()
  })

  it("keeps the reader on the page instead of sending them back home", () => {
    renderWithProviders(<AboutPage />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})

describe("storefront about route", () => {
  it("loads only the about namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.about"] })
  })
})
