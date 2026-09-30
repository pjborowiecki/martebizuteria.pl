import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

afterEach(cleanup)

describe("MDX content", () => {
  it("preserves semantic headings, lists, emphasis, and supplied attributes", () => {
    render(
      <>
        <mdxComponents.h1>Care guide</mdxComponents.h1>
        <mdxComponents.h2 id="cleaning">Cleaning</mdxComponents.h2>
        <mdxComponents.h3>Silver</mdxComponents.h3>
        <mdxComponents.p>
          Use a <mdxComponents.strong>soft cloth</mdxComponents.strong>.
        </mdxComponents.p>
        <mdxComponents.ol>
          <mdxComponents.li>Polish gently</mdxComponents.li>
        </mdxComponents.ol>
        <mdxComponents.ul>
          <mdxComponents.li>Avoid chlorine</mdxComponents.li>
        </mdxComponents.ul>
      </>,
    )

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Care guide")
    expect(screen.getByRole("heading", { level: 2 })).toHaveAttribute("id", "cleaning")
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Silver")
    expect(screen.getByText("soft cloth").tagName).toBe("STRONG")
    expect(screen.getAllByRole("list").map((list) => list.tagName)).toStrictEqual(["OL", "UL"])
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("localizes internal page links", () => {
    render(
      <mdxComponents.a href="/about" title="About the atelier">
        Our atelier
      </mdxComponents.a>,
    )

    expect(screen.getByRole("link", { name: "Our atelier" })).toHaveAttribute("href", "/en-US/about")
    expect(screen.getByRole("link", { name: "Our atelier" })).toHaveAttribute("title", "About the atelier")
  })

  it.each(["https://example.com/guide", "mailto:shop@example.com", "#cleaning", "/care-guide.pdf"])(
    "preserves the non-page destination %s",
    (href) => {
      render(<mdxComponents.a href={href}>Guide</mdxComponents.a>)

      expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("href", href)
    },
  )

  it("renders an anchor without a destination", () => {
    render(<mdxComponents.a id="care">Care</mdxComponents.a>)

    expect(screen.getByText("Care")).not.toHaveAttribute("href")
  })
})
