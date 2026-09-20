import { type ReactNode } from "react"

import { Tooltip } from "@base-ui/react/tooltip"
import { type QueryClient } from "@tanstack/react-query"
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router"

import { ThemesProvider } from "~/src/providers/themes-provider"
import { TranslationsProvider } from "~/src/providers/translations-provider"

import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { getRouteNamespaces, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
import { deLocalizeUrl, extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.utils"

import { SIDEBAR_INIT_SCRIPT, adminSidebarCollapsedCriticalStyle } from "~/src/presentation/theme/sidebar-preference"
import { THEME_INIT_SCRIPT, adminShellCriticalStyle } from "~/src/presentation/theme/theme-init"

import { isAdminPathname } from "~/src/lib/admin-route"
import { type ImagePrefetchService } from "~/src/lib/image"
import { buildLocalizedUrl } from "~/src/lib/sitemap"
import { getBaseURL } from "~/src/lib/url"

import { APP_NAME } from "~/src/presentation/branding/app"

import { Toaster } from "~/src/presentation/components/shadcn/sonner"

import { DATAGRID_PREFS_INIT_SCRIPT } from "~/src/presentation/components/custom/datagrid/datagrid-init"
import { VerificationToast } from "~/src/presentation/components/custom/pages/auth/verification-toast"
import { StorefrontCriticalFontsHead } from "~/src/presentation/components/custom/storefront-critical-fonts-head"

import globalsCss from "~/src/presentation/styles/globals.css?url"
const RootComponent = () => {
  const { internalPathname, locale } = Route.useRouteContext()
  const isAdmin = isAdminPathname(internalPathname)
  return (
    <TranslationsProvider locale={locale}>
      <ThemesProvider>
        <Tooltip.Provider delay={0}>
          <RootDocument internalPathname={internalPathname} locale={locale}>
            <Outlet />
            <VerificationToast />
            <Toaster variant={isAdmin ? "admin" : "default"} />
            <Scripts />
          </RootDocument>
        </Tooltip.Provider>
      </ThemesProvider>
    </TranslationsProvider>
  )
}
const RootDocument = ({
  children,
  internalPathname,
  locale,
}: Readonly<{
  children: ReactNode
  internalPathname: string
  locale: Locale
}>) => {
  const isAdmin = isAdminPathname(internalPathname)
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      {...(isAdmin
        ? {
            "data-admin-shell": "",
          }
        : {})}
    >
      <head>
        <script dangerouslySetInnerHTML={THEME_INIT_SCRIPT_HTML} />
        <script dangerouslySetInnerHTML={SIDEBAR_INIT_SCRIPT_HTML} />
        <script dangerouslySetInnerHTML={DATAGRID_PREFS_INIT_SCRIPT_HTML} />
        {!isAdmin && <StorefrontCriticalFontsHead locale={locale} />}
        <HeadContent />
      </head>
      <body>{children}</body>
    </html>
  )
}
const THEME_INIT_SCRIPT_HTML = {
  __html: THEME_INIT_SCRIPT,
}
const DATAGRID_PREFS_INIT_SCRIPT_HTML = {
  __html: DATAGRID_PREFS_INIT_SCRIPT,
}
const SIDEBAR_INIT_SCRIPT_HTML = {
  __html: SIDEBAR_INIT_SCRIPT,
}
interface RouterContext {
  imagePrefetchService: ImagePrefetchService
  queryClient: QueryClient
}
interface RootRouteContext {
  internalPathname: string
  locale: Locale
}
const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location, matches }): Promise<RootRouteContext> => {
    const locale = extractLocaleFromPath(new URL(location.publicHref, "http://localhost").pathname) ?? DEFAULT_LOCALE
    await preloadNamespaces({
      locale,
      namespaces: getRouteNamespaces(matches),
      queryClient: context.queryClient,
    })
    return {
      internalPathname: deLocalizeUrl(new URL(location.publicHref, "http://localhost")).pathname,
      locale,
    }
  },
  component: RootComponent,
  head: ({ match }) => {
    const appUrl = getBaseURL()
    // The router merges the `beforeLoad` result into the match context only once it resolves.
    // An error page still renders the head, so this can run with the router context alone.
    const rootContext: Partial<RootRouteContext> = match.context
    const path = rootContext.internalPathname ?? "/"
    const locale = rootContext.locale ?? DEFAULT_LOCALE
    const canonicalUrl = buildLocalizedUrl(appUrl, path, locale)
    const xDefaultUrl = buildLocalizedUrl(appUrl, path, DEFAULT_LOCALE)
    const adminCriticalStyle = [adminShellCriticalStyle(path), adminSidebarCollapsedCriticalStyle(path)].filter(Boolean).join("")
    return {
      links: [
        {
          href: globalsCss,
          rel: "stylesheet",
        },
        {
          href: canonicalUrl,
          rel: "canonical",
        },
        ...LOCALES.map((loc) => ({
          href: buildLocalizedUrl(appUrl, path, loc),
          hrefLang: loc,
          rel: "alternate",
        })),
        {
          href: xDefaultUrl,
          hrefLang: "x-default",
          rel: "alternate",
        },
      ],
      meta: [
        {
          charSet: "utf8",
        },
        {
          title: APP_NAME,
        },
        {
          content: "width=device-width, initial-scale=1",
          name: "viewport",
        },
        {
          content: "website",
          property: "og:type",
        },
        {
          content: APP_NAME,
          property: "og:site_name",
        },
        {
          content: locale,
          property: "og:locale",
        },
        {
          content: "summary_large_image",
          name: "twitter:card",
        },
      ],
      styles:
        adminCriticalStyle === ""
          ? undefined
          : [
              {
                children: adminCriticalStyle,
              },
            ],
    }
  },
})
export { Route }
