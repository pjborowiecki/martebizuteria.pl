import { CONSTANTS } from "~/src/constants";

import type { LocalizedTo } from "~/src/components/custom/localized-link";

import type { FileRouteTypes } from "~/src/routeTree.gen";

type RouterTo = FileRouteTypes["to"];

const REGEX_CAPTURE_GROUP_INDEX = 1;

export interface MenuPathNavigateTarget {
  readonly params?: Record<string, string>;
  readonly to: RouterTo;
}

export interface LocalizedMenuPathTarget {
  readonly params?: Record<string, string>;
  readonly to: LocalizedTo;
}

const PARAMETRIC_MENU_PATH_ROUTES = [
  { param: "slug", pattern: /^\/blog\/([^/]+)$/u, to: "/{-$locale}/blog/$slug" },
  { param: "handle", pattern: /^\/collections\/([^/]+)$/u, to: "/{-$locale}/collections/$handle" },
  { param: "handle", pattern: /^\/categories\/([^/]+)$/u, to: "/{-$locale}/categories/$handle" },
  { param: "handle", pattern: /^\/products\/([^/]+)$/u, to: "/{-$locale}/products/$handle" }
] as const satisfies readonly {
  readonly param: string;
  readonly pattern: RegExp;
  readonly to: RouterTo;
}[];

const STATIC_MENU_PATH_TO_ROUTE: Record<string, RouterTo> = {
  [CONSTANTS.ROUTES.ABOUT]: "/{-$locale}/about",
  [CONSTANTS.ROUTES.BLOG]: "/{-$locale}/blog",
  [CONSTANTS.ROUTES.ACCOUNT]: "/{-$locale}/account",
  [CONSTANTS.ROUTES.CART]: "/{-$locale}/cart",
  [CONSTANTS.ROUTES.CHECKOUT]: "/{-$locale}/checkout",
  [CONSTANTS.ROUTES.COLLECTIONS]: "/{-$locale}/collections",
  [CONSTANTS.ROUTES.CATEGORIES]: "/{-$locale}/categories",
  [CONSTANTS.ROUTES.EXCHANGES_AND_RETURNS]: "/{-$locale}/exchanges-and-returns",
  [CONSTANTS.ROUTES.FAQ]: "/{-$locale}/faq",
  [CONSTANTS.ROUTES.HOME]: "/{-$locale}",
  [CONSTANTS.ROUTES.PRIVACY_POLICY]: "/{-$locale}/privacy-policy",
  [CONSTANTS.ROUTES.PRODUCTS]: "/{-$locale}/products",
  [CONSTANTS.ROUTES.TERMS_OF_SERVICE]: "/{-$locale}/terms-of-service"
};

const PARAMETRIC_LOCALIZED_MENU_PATHS = [
  { param: "slug", pattern: /^\/blog\/([^/]+)$/u, to: CONSTANTS.ROUTES.BLOG_POST },
  { param: "handle", pattern: /^\/collections\/([^/]+)$/u, to: CONSTANTS.ROUTES.COLLECTION },
  { param: "handle", pattern: /^\/categories\/([^/]+)$/u, to: CONSTANTS.ROUTES.CATEGORY },
  { param: "handle", pattern: /^\/products\/([^/]+)$/u, to: CONSTANTS.ROUTES.PRODUCT }
] as const satisfies readonly {
  readonly param: string;
  readonly pattern: RegExp;
  readonly to: LocalizedTo;
}[];

const STATIC_LOCALIZED_MENU_PATHS: Record<string, LocalizedTo> = {
  [CONSTANTS.ROUTES.ABOUT]: CONSTANTS.ROUTES.ABOUT,
  [CONSTANTS.ROUTES.BLOG]: CONSTANTS.ROUTES.BLOG,
  [CONSTANTS.ROUTES.ACCOUNT]: CONSTANTS.ROUTES.ACCOUNT,
  [CONSTANTS.ROUTES.CART]: CONSTANTS.ROUTES.CART,
  [CONSTANTS.ROUTES.CHECKOUT]: CONSTANTS.ROUTES.CHECKOUT,
  [CONSTANTS.ROUTES.COLLECTIONS]: CONSTANTS.ROUTES.COLLECTIONS,
  [CONSTANTS.ROUTES.CATEGORIES]: CONSTANTS.ROUTES.CATEGORIES,
  [CONSTANTS.ROUTES.EXCHANGES_AND_RETURNS]: CONSTANTS.ROUTES.EXCHANGES_AND_RETURNS,
  [CONSTANTS.ROUTES.FAQ]: CONSTANTS.ROUTES.FAQ,
  [CONSTANTS.ROUTES.HOME]: CONSTANTS.ROUTES.HOME,
  [CONSTANTS.ROUTES.PRIVACY_POLICY]: CONSTANTS.ROUTES.PRIVACY_POLICY,
  [CONSTANTS.ROUTES.PRODUCTS]: CONSTANTS.ROUTES.PRODUCTS,
  [CONSTANTS.ROUTES.TERMS_OF_SERVICE]: CONSTANTS.ROUTES.TERMS_OF_SERVICE
};

function normalizeMenuPath(path: string): string {
  if (path === CONSTANTS.ROUTES.HOME) {
    return CONSTANTS.ROUTES.HOME;
  }

  return path.replace(/\/$/u, "");
}

export function resolveMenuPathNavigation(path: string): MenuPathNavigateTarget {
  const normalized = normalizeMenuPath(path);

  if (normalized === CONSTANTS.ROUTES.HOME) {
    return { to: "/{-$locale}" };
  }

  for (const route of PARAMETRIC_MENU_PATH_ROUTES) {
    const match = route.pattern.exec(normalized);
    if (match !== null) {
      return { params: { [route.param]: match[REGEX_CAPTURE_GROUP_INDEX] }, to: route.to };
    }
  }

  const staticRoute = STATIC_MENU_PATH_TO_ROUTE[normalized];
  if (staticRoute !== undefined) {
    return { to: staticRoute };
  }

  return { to: "/{-$locale}" };
}

export function resolveLocalizedMenuPath(path: string): LocalizedMenuPathTarget {
  const normalized = normalizeMenuPath(path);

  if (normalized === CONSTANTS.ROUTES.HOME) {
    return { to: CONSTANTS.ROUTES.HOME };
  }

  for (const route of PARAMETRIC_LOCALIZED_MENU_PATHS) {
    const match = route.pattern.exec(normalized);
    if (match !== null) {
      return { params: { [route.param]: match[REGEX_CAPTURE_GROUP_INDEX] }, to: route.to };
    }
  }

  const staticRoute = STATIC_LOCALIZED_MENU_PATHS[normalized];
  if (staticRoute !== undefined) {
    return { to: staticRoute };
  }

  return { to: CONSTANTS.ROUTES.HOME };
}
