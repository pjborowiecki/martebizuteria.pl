import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import {
  EMAIL_HIGHLIGHT_BOX_STYLE,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
  EmailHighlightBox,
} from "~/src/presentation/emails/email-highlight-box"

describe("EmailHighlightBox", () => {
  it("renders the title above the body", async () => {
    const text = await render(<EmailHighlightBox body="Once confirmed, your account is active." title="What happens next" />, {
      plainText: true,
    })

    expect(text.indexOf("What happens next")).toBeLessThan(text.indexOf("Once confirmed, your account is active."))
  })

  it("paints the box with the wash surface and the line border", async () => {
    const html = await render(<EmailHighlightBox body="Body" title="Title" />)

    expect(html).toContain("background-color:#faf8f5")
    expect(html).toContain("border:1px solid #e2ddd4")
    expect(html).toContain("padding:20px 20px")
  })

  it("marks the title up as uppercase tracked small text", async () => {
    const html = await render(<EmailHighlightBox body="Body" title="Title" />)

    expect(html).toContain("text-[11px]")
    expect(html).toContain("tracking-[0.22em]")
    expect(html).toContain("uppercase")
  })
})

describe("EmailBorderedSection", () => {
  it("wraps arbitrary children in the same bordered surface", async () => {
    const html = await render(
      <EmailBorderedSection>
        <EmailBodyText>Order reference</EmailBodyText>
      </EmailBorderedSection>,
    )

    expect(html).toContain("background-color:#faf8f5")
    expect(html).toContain("Order reference")
  })

  it("uses the shared highlight box style rather than its own copy", () => {
    expect(EMAIL_HIGHLIGHT_BOX_STYLE).toStrictEqual({
      backgroundColor: "#faf8f5",
      border: "1px solid #e2ddd4",
      margin: "24px 0",
      padding: "20px 20px",
    })
  })
})

describe("EmailBodyText", () => {
  it("renders the body copy with the shared type scale", async () => {
    const html = await render(<EmailBodyText>Dear Jane,</EmailBodyText>)

    expect(html).toContain("Dear Jane,")
    expect(html).toContain('class="text-ink m-0 text-[15px] leading-[26px]"')
  })

  it("appends an extra class when one is supplied", async () => {
    const html = await render(<EmailBodyText className="mt-[16px]">Dear Jane,</EmailBodyText>)

    expect(html).toContain('class="text-ink m-0 text-[15px] leading-[26px] mt-[16px]"')
  })

  it("leaves no trailing space in the class list when no extra class is supplied", async () => {
    const html = await render(<EmailBodyText className="">Dear Jane,</EmailBodyText>)

    expect(html).not.toContain('leading-[26px] "')
  })
})

describe("EmailDetailRow", () => {
  it("puts the label above its value", async () => {
    const text = await render(<EmailDetailRow label="Refund">PLN 398.99</EmailDetailRow>, { plainText: true })

    expect(text).toContain("Refund\n\nPLN 398.99")
  })

  it("spaces a row from the one above it unless it opens the group", async () => {
    const following = await render(<EmailDetailRow label="Order total">PLN 398.99</EmailDetailRow>)
    const first = await render(
      <EmailDetailRow isFirst label="Refund">
        PLN 398.99
      </EmailDetailRow>,
    )

    expect(following).toContain("mt-[20px]")
    expect(first).not.toContain("mt-[20px]")
  })
})
