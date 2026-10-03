import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))

import { docsMdxComponents } from "~/src/presentation/components/custom/docs-mdx"
import { mdxComponents } from "~/src/presentation/components/custom/mdx"

afterEach(cleanup)

describe("documentation MDX components", () => {
  it("builds on the storefront elements for headings, paragraphs and links", () => {
    expect(docsMdxComponents.h1).toBe(mdxComponents.h1)
    expect(docsMdxComponents.p).toBe(mdxComponents.p)
    expect(docsMdxComponents.a).toBe(mdxComponents.a)
  })

  it("renders a code sample as code inside a preformatted block", () => {
    render(
      <docsMdxComponents.pre data-language="sh">
        <docsMdxComponents.code>vp test run</docsMdxComponents.code>
      </docsMdxComponents.pre>,
    )

    const sample = screen.getByText("vp test run")

    expect(sample.tagName).toBe("CODE")
    expect(sample.parentElement?.tagName).toBe("PRE")
    expect(sample.parentElement).toHaveAttribute("data-language", "sh")
  })

  it("renders a note as a block quote that keeps its attributes", () => {
    render(
      <docsMdxComponents.blockquote cite="https://viteplus.dev/guide/">Run the checks before committing.</docsMdxComponents.blockquote>,
    )

    const note = screen.getByText("Run the checks before committing.")

    expect(note.tagName).toBe("BLOCKQUOTE")
    expect(note).toHaveAttribute("cite", "https://viteplus.dev/guide/")
  })

  it("renders a fourth-level heading and a rule between sections", () => {
    render(
      <>
        <docsMdxComponents.h4 id="flags">Flags</docsMdxComponents.h4>
        <docsMdxComponents.hr />
      </>,
    )

    expect(screen.getByRole("heading", { level: 4, name: "Flags" })).toHaveAttribute("id", "flags")
    expect(screen.getByRole("separator")).toBeInTheDocument()
  })
})
