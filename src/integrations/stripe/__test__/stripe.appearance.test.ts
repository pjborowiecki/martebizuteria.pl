import { describe, expect, it } from "vite-plus/test"

import { getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance"

const light = getStripeAppearance("light")

const dark = getStripeAppearance("dark")

describe("getStripeAppearance", () => {
  it("selects the Stripe base theme matching the app theme", () => {
    expect(light.theme).toBe("stripe")
    expect(dark.theme).toBe("night")
  })

  it("inverts text and background between the two themes", () => {
    expect(light.variables?.colorBackground).toBe("#ffffff")
    expect(light.variables?.colorText).toBe("#0a0a0a")
    expect(dark.variables?.colorBackground).toBe("#0a0a0a")
    expect(dark.variables?.colorText).toBe("#fafafa")
  })

  it("keeps the squared-off borderless input styling in both themes", () => {
    for (const appearance of [light, dark]) {
      expect(appearance.variables?.borderRadius).toBe("0")
      expect(appearance.rules?.[".Input"]?.["border"]).toBe("none")
      expect(appearance.rules?.[".Input"]?.["borderRadius"]).toBe("0")
      expect(appearance.rules?.[".AccordionItem"]?.["borderRadius"]).toBe("0")
    }
  })

  it("uses a lighter danger colour on dark so the error stays legible", () => {
    expect(light.variables?.colorDanger).toBe("#dc2626")
    expect(dark.variables?.colorDanger).toBe("#f87171")
    expect(light.rules?.[".Input--invalid"]?.["borderBottom"]).toBe("1px solid #dc2626")
    expect(dark.rules?.[".Input--invalid"]?.["borderBottom"]).toBe("1px solid #f87171")
  })

  it("underlines the focused input with the primary text colour", () => {
    expect(light.rules?.[".Input:focus"]?.["borderBottom"]).toBe("1px solid #0a0a0a")
    expect(dark.rules?.[".Input:focus"]?.["borderBottom"]).toBe("1px solid #fafafa")
  })

  it("distinguishes the selected accordion tab from the resting one", () => {
    expect(light.rules?.[".AccordionItem"]?.["border"]).toBe("1px solid #ededed")
    expect(light.rules?.[".AccordionItem--selected"]?.["borderColor"]).toBe("#b6b6b6")
    expect(dark.rules?.[".AccordionItem"]?.["border"]).toBe("1px solid #1f1f1f")
    expect(dark.rules?.[".AccordionItem--selected"]?.["borderColor"]).toBe("#525252")
  })

  it("tints the hovered accordion with the muted surface of its theme", () => {
    expect(light.rules?.[".AccordionItem:hover"]?.["backgroundColor"]).toBe("#f7f7f7")
    expect(dark.rules?.[".AccordionItem:hover"]?.["backgroundColor"]).toBe("#141414")
  })

  it("removes every focus and elevation shadow Stripe applies by default", () => {
    const shadowed = [".Input", ".Input:focus", ".Input--invalid", ".AccordionItem", ".AccordionItem:focus-visible"]

    for (const appearance of [light, dark]) {
      for (const selector of shadowed) {
        expect(appearance.rules?.[selector]?.["boxShadow"]).toBe("none")
      }
    }
  })

  it("renders the uppercase tracked label the storefront uses", () => {
    expect(light.rules?.[".Label"]).toStrictEqual({
      color: "#6b6b6b",
      fontSize: "10px",
      fontWeight: "500",
      letterSpacing: "0.22em",
      marginBottom: "8px",
      textTransform: "uppercase",
    })
  })

  it("keeps the app font stack instead of the Stripe default", () => {
    expect(light.variables?.fontFamily).toBe("Manrope, ui-sans-serif, system-ui, sans-serif")
    expect(dark.variables?.fontFamily).toBe(light.variables?.fontFamily)
  })

  it("paints the radio marker with the theme text colour and the ring with the secondary one", () => {
    expect(dark.rules?.[".RadioIconInner"]?.["fill"]).toBe("#fafafa")
    expect(dark.rules?.[".RadioIconOuter"]?.["stroke"]).toBe("#a1a1a1")
    expect(dark.rules?.[".RadioIconOuter--checked"]?.["stroke"]).toBe("#fafafa")
  })
})
