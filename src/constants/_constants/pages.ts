// Internal (de-localized) paths for all publicly indexable pages.
// Add a new entry here whenever you add a new public route.
// These are TanStack Router's internal paths — locale prefixes are added automatically.
export const STATIC_PAGES = ["/", "/about"] as const;
export type StaticPage = (typeof STATIC_PAGES)[number];
