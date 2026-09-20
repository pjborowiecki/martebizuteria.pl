export const CLIP_CLOSED = "inset(0 0 100% 0)"
export const CLIP_OPEN = "inset(0 0 0% 0)"
export const HEADER_OFFSET_PX = 96

export const MENU_MEDIA = {
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023px)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const

export const DUR_QUICK = 0.01
export const POS_IMMEDIATE = 0
export const DUR_BASE = 1.2
export const DUR_PANEL = 1.05
export const DUR_BACKDROP = 0.85
export const DUR_HEADER = 0.65
export const DUR_LINK = 0.95
export const DUR_IMAGE = 1.25
export const DUR_FOOTER = 0.6

export const STAGGER_LINK = 0.07
export const STAGGER_SECONDARY = 0.05

export const POS_HEADER = 0.12
export const POS_LINK = 0.18
export const POS_SECONDARY = 0.45
export const POS_IMAGE = 0.12
export const POS_FOOTER = 0.55

export const REVERSE_TIMESCALE = 1.6

export const MOUSE_CENTER_OFFSET = 0.5
export const MOUSE_MULTIPLIER = 2
export const PARALLAX_OFFSET = 25
export const ROTATION_MULTIPLIER = 6

export const HOVER_Y_OFFSET = -2
export const HOVER_SCALE = 1.08
export const HOVER_ENTER_DURATION = 0.42
export const HOVER_LEAVE_DURATION = 0.48

export const ACTIVE_SCALE = 1
export const INACTIVE_SCALE = 1.05
export const AUTO_ALPHA_VISIBLE = 1
export const AUTO_ALPHA_HIDDEN = 0
