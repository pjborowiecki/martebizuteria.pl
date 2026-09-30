import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
import { type FileRouteTypes } from "~/src/routeTree.gen"

const normalizeMenuPath = (path: string): string => {
  if (path === ROUTES.HOME) {
    return ROUTES.HOME
  }

  return path.replace(/\/$/u, "")
}

export const resolveMenuPathNavigation = (path: string): MenuPathNavigateTarget => {
  const normalized = normalizeMenuPath(path)
  if (normalized === ROUTES.HOME) {
    return { to: "/" }
  }

  for (const route of PARAMETRIC_MENU_PATH_ROUTES) {
    const match = route.pattern.exec(normalized)
    const value = match?.groups?.["value"]
    if (value !== undefined) {
      return { params: { [route.param]: value }, to: route.to }
    }
  }

  const staticRoute = STATIC_MENU_PATH_TO_ROUTE[normalized]
  if (staticRoute !== undefined) {
    return { to: staticRoute }
  }

  return { to: "/" }
}

export const resolveLocalizedMenuPath = (path: string): LocalizedMenuPathTarget => {
  const normalized = normalizeMenuPath(path)
  if (normalized === ROUTES.HOME) {
    return { to: ROUTES.HOME }
  }

  for (const route of PARAMETRIC_LOCALIZED_MENU_PATHS) {
    const match = route.pattern.exec(normalized)
    const value = match?.groups?.["value"]
    if (value !== undefined) {
      return { params: { [route.param]: value }, to: route.to }
    }
  }

  const staticRoute = STATIC_LOCALIZED_MENU_PATHS[normalized]
  if (staticRoute !== undefined) {
    return { to: staticRoute }
  }

  return { to: ROUTES.HOME }
}

type RouterTo = FileRouteTypes["to"]

export interface MenuPathNavigateTarget {
  readonly params?: Record<string, string>
  readonly to: RouterTo
}

export interface LocalizedMenuPathTarget {
  readonly params?: Record<string, string>
  readonly to: LocalizedTo
}

const PARAMETRIC_MENU_PATH_ROUTES = [
  { param: "slug", pattern: /^\/blog\/(?<value>[^/]+)$/u, to: "/blog/$slug" },
  { param: "handle", pattern: /^\/collections\/(?<value>[^/]+)$/u, to: "/collections/$handle" },
  { param: "handle", pattern: /^\/categories\/(?<value>[^/]+)$/u, to: "/categories/$handle" },
  { param: "handle", pattern: /^\/products\/(?<value>[^/]+)$/u, to: "/products/$handle" },
] as const satisfies readonly {
  readonly param: string
  readonly pattern: RegExp
  readonly to: RouterTo
}[]

const STATIC_MENU_PATH_TO_ROUTE: Record<string, RouterTo> = {
  [ROUTES.ABOUT]: "/about",
  [ROUTES.BLOG]: "/blog",
  [ROUTES.ACCOUNT]: "/account",
  [ROUTES.CART]: "/cart",
  [ROUTES.CHECKOUT]: "/checkout",
  [ROUTES.COLLECTIONS]: "/collections",
  [ROUTES.CATEGORIES]: "/categories",
  [ROUTES.EXCHANGES_AND_RETURNS]: "/exchanges-and-returns",
  [ROUTES.FAQ]: "/faq",
  [ROUTES.HOME]: "/",
  [ROUTES.PRIVACY_POLICY]: "/privacy-policy",
  [ROUTES.PRODUCTS]: "/products",
  [ROUTES.TERMS_OF_SERVICE]: "/terms-of-service",
}

const PARAMETRIC_LOCALIZED_MENU_PATHS = [
  { param: "slug", pattern: /^\/blog\/(?<value>[^/]+)$/u, to: ROUTES.BLOG_POST },
  { param: "handle", pattern: /^\/collections\/(?<value>[^/]+)$/u, to: ROUTES.COLLECTION },
  { param: "handle", pattern: /^\/categories\/(?<value>[^/]+)$/u, to: ROUTES.CATEGORY },
  { param: "handle", pattern: /^\/products\/(?<value>[^/]+)$/u, to: ROUTES.PRODUCT },
] as const satisfies readonly {
  readonly param: string
  readonly pattern: RegExp
  readonly to: LocalizedTo
}[]

const STATIC_LOCALIZED_MENU_PATHS: Record<string, LocalizedTo> = {
  [ROUTES.ABOUT]: ROUTES.ABOUT,
  [ROUTES.BLOG]: ROUTES.BLOG,
  [ROUTES.ACCOUNT]: ROUTES.ACCOUNT,
  [ROUTES.CART]: ROUTES.CART,
  [ROUTES.CHECKOUT]: ROUTES.CHECKOUT,
  [ROUTES.COLLECTIONS]: ROUTES.COLLECTIONS,
  [ROUTES.CATEGORIES]: ROUTES.CATEGORIES,
  [ROUTES.EXCHANGES_AND_RETURNS]: ROUTES.EXCHANGES_AND_RETURNS,
  [ROUTES.FAQ]: ROUTES.FAQ,
  [ROUTES.HOME]: ROUTES.HOME,
  [ROUTES.PRIVACY_POLICY]: ROUTES.PRIVACY_POLICY,
  [ROUTES.PRODUCTS]: ROUTES.PRODUCTS,
  [ROUTES.TERMS_OF_SERVICE]: ROUTES.TERMS_OF_SERVICE,
}
