/** Matches `:root --sidebar`; fills viewport + `scrollbar-gutter` behind the main column. */
export const ADMIN_SHELL_CHROME_BG = "oklch(0.141 0.005 285.823)";

/** Light zinc canvas for admin main (sidebar stays dark via `bg-sidebar`). */
export const ADMIN_LAYOUT_BG_CLASS = "bg-zinc-100";

/** Solid card surface — no slate gradient halo on the zinc canvas. */
export const ADMIN_CARD_CLASS = "gap-0 border-border/60 bg-card py-0 shadow-none ring-0";

/** Page body under {@link AdminHeader}; `min-w-0` keeps wide datagrids from widening the flex column past the viewport. */
export const ADMIN_PAGE_BODY_CLASS = "min-w-0 flex-1 space-y-5 p-8";
