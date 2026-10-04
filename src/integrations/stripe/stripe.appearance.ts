import { type Appearance, type CssFontSource } from "@stripe/stripe-js"

export const STRIPE_FONTS: CssFontSource[] = [
  { cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&display=swap" },
]

export const getStripeAppearance = (theme: "light" | "dark"): Appearance => {
  const isDark = theme === "dark"
  const colorBackground = isDark ? "#0a0a0a" : "#ffffff"
  const colorText = isDark ? "#fafafa" : "#0a0a0a"
  const colorTextSecondary = isDark ? "#a1a1a1" : "#6b6b6b"
  const colorPrimary = isDark ? "#fafafa" : "#0a0a0a"
  const colorDanger = isDark ? "#f87171" : "#dc2626"
  const colorBorder = isDark ? "#2a2a2a" : "#e4e4e4"
  const colorMutedSurface = isDark ? "#141414" : "#f7f7f7"
  const tabBorderResting = isDark ? "#1f1f1f" : "#ededed"
  const tabBorderSelected = isDark ? "#525252" : "#b6b6b6"

  return {
    rules: {
      ".AccordionItem": {
        backgroundColor: "transparent",
        border: `1px solid ${tabBorderResting}`,
        borderRadius: "0",
        boxShadow: "none",
        paddingBottom: "16px",
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "16px",
      },
      ".AccordionItem--selected": {
        backgroundColor: "transparent",
        borderColor: tabBorderSelected,
        color: colorText,
      },
      ".AccordionItem:focus-visible": {
        boxShadow: "none",
        outline: "none",
      },
      ".AccordionItem:hover": {
        backgroundColor: colorMutedSurface,
        borderColor: colorBorder,
      },
      ".Input": {
        backgroundColor: "transparent",
        border: "none",
        borderBottom: `1px solid ${colorBorder}`,
        borderRadius: "0",
        boxShadow: "none",
        fontSize: "14px",
        padding: "10px 0",
      },
      ".Input--invalid": {
        borderBottom: `1px solid ${colorDanger}`,
        boxShadow: "none",
        color: colorText,
      },
      ".Input::placeholder": {
        color: colorTextSecondary,
      },
      ".Input:focus": {
        borderBottom: `1px solid ${colorText}`,
        boxShadow: "none",
        outline: "none",
      },
      ".Label": {
        color: colorTextSecondary,
        fontSize: "10px",
        fontWeight: "500",
        letterSpacing: "0.22em",
        marginBottom: "8px",
        textTransform: "uppercase",
      },
      ".RadioIcon": {
        width: "16px",
      },
      ".RadioIconInner": {
        fill: colorText,
      },
      ".RadioIconOuter": {
        stroke: colorTextSecondary,
      },
      ".RadioIconOuter--checked": {
        stroke: colorText,
      },
    },
    theme: isDark ? "night" : "stripe",
    variables: {
      accordionItemSpacing: "12px",
      borderRadius: "0",
      colorBackground,
      colorDanger,
      colorPrimary,
      colorText,
      colorTextSecondary,
      fontFamily: FONT_FAMILY,
      fontSizeBase: "14px",
      gridColumnSpacing: "12px",
      gridRowSpacing: "20px",
      iconChevronDownColor: colorTextSecondary,
      spacingUnit: "4px",
    },
  }
}

const FONT_FAMILY = "Manrope, ui-sans-serif, system-ui, sans-serif"
