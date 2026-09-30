import { describe, expect, it } from "vite-plus/test"

import * as CONSTANTS from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"

describe("menu clip path", () => {
  it("hides the panel completely when closed and reveals it completely when open", () => {
    expect(CONSTANTS.CLIP_CLOSED).toBe("inset(0 0 100% 0)")
    expect(CONSTANTS.CLIP_OPEN).toBe("inset(0 0 0% 0)")
  })
})

describe("menu media queries", () => {
  it("splits desktop from mobile at the same breakpoint without overlapping", () => {
    expect(CONSTANTS.MENU_MEDIA.desktop).toBe("(min-width: 1024px)")
    expect(CONSTANTS.MENU_MEDIA.mobile).toBe("(max-width: 1023px)")
  })

  it("asks about motion preference in both directions", () => {
    expect(CONSTANTS.MENU_MEDIA.motion).toBe("(prefers-reduced-motion: no-preference)")
    expect(CONSTANTS.MENU_MEDIA.reduced).toBe("(prefers-reduced-motion: reduce)")
  })
})

describe("menu timeline durations", () => {
  it("collapses every animation to a near-instant duration for reduced motion", () => {
    for (const duration of [
      CONSTANTS.DUR_BASE,
      CONSTANTS.DUR_PANEL,
      CONSTANTS.DUR_BACKDROP,
      CONSTANTS.DUR_HEADER,
      CONSTANTS.DUR_LINK,
      CONSTANTS.DUR_IMAGE,
      CONSTANTS.DUR_FOOTER,
    ]) {
      expect(duration).toBeGreaterThan(CONSTANTS.DUR_QUICK)
    }
  })

  it("starts the panel before the content it reveals", () => {
    expect(CONSTANTS.POS_IMMEDIATE).toBe(0)
    expect(CONSTANTS.POS_HEADER).toBeLessThan(CONSTANTS.POS_LINK)
    expect(CONSTANTS.POS_LINK).toBeLessThan(CONSTANTS.POS_SECONDARY)
    expect(CONSTANTS.POS_SECONDARY).toBeLessThan(CONSTANTS.POS_FOOTER)
  })

  it("closes the menu faster than it opens", () => {
    expect(CONSTANTS.REVERSE_TIMESCALE).toBeGreaterThan(1)
  })

  it("staggers the secondary links more tightly than the primary ones", () => {
    expect(CONSTANTS.STAGGER_SECONDARY).toBeLessThan(CONSTANTS.STAGGER_LINK)
  })
})

describe("menu hover and parallax", () => {
  it("measures the pointer from the centre of the surface", () => {
    expect(CONSTANTS.MOUSE_CENTER_OFFSET * CONSTANTS.MOUSE_MULTIPLIER).toBe(1)
  })

  it("lifts the hovered element upwards and scales it past its resting size", () => {
    expect(CONSTANTS.HOVER_Y_OFFSET).toBeLessThan(CONSTANTS.POS_IMMEDIATE)
    expect(CONSTANTS.HOVER_SCALE).toBeGreaterThan(CONSTANTS.ACTIVE_SCALE)
  })

  it("leaves a hover more slowly than it enters", () => {
    expect(CONSTANTS.HOVER_LEAVE_DURATION).toBeGreaterThan(CONSTANTS.HOVER_ENTER_DURATION)
  })

  it("shows the active image at its natural size and the inactive ones zoomed in", () => {
    expect(CONSTANTS.ACTIVE_SCALE).toBe(1)
    expect(CONSTANTS.INACTIVE_SCALE).toBeGreaterThan(CONSTANTS.ACTIVE_SCALE)
  })

  it("treats full opacity as visible and zero as hidden", () => {
    expect(CONSTANTS.AUTO_ALPHA_VISIBLE).toBe(1)
    expect(CONSTANTS.AUTO_ALPHA_HIDDEN).toBe(0)
  })

  it("keeps the header offset large enough to clear the sticky banner", () => {
    expect(CONSTANTS.HEADER_OFFSET_PX).toBeGreaterThan(0)
  })
})
