export const STATIC_PAGES = ["/", "/about", "/blog"] as const

export type StaticPage = (typeof STATIC_PAGES)[number]
