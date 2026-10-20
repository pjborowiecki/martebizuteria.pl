import { type ReactNode } from "react"

import { Tooltip } from "@base-ui/react/tooltip"
import { type QueryClient } from "@tanstack/react-query"
import { HeadContent, Outlet, Scripts, createRootRouteWithContext, useRouter } from "@tanstack/react-router"

import { ThemesProvider } from "~/src/providers/themes-provider"
import { TranslationsProvider } from "~/src/providers/translations-provider"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { displayPreferencesQuery } from "~/src/integrations/use-intl/i18n.display-preferences"
import { getRouteNamespaces, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale, getCurrentPathname } from "~/src/integrations/use-intl/i18n.utils"

import { SIDEBAR_INIT_SCRIPT, adminSidebarCollapsedCriticalStyle } from "~/src/presentation/theme/sidebar-preference"
import { THEME_INIT_SCRIPT, adminShellCriticalStyle } from "~/src/presentation/theme/theme-init"

import { type ImagePrefetchService } from "~/src/lib/image"
import { isNoIndexPathname } from "~/src/lib/seo"

import { APP_ICON, APP_NAME, APP_URL, OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH, THEME_COLOR } from "~/src/presentation/branding/app"

import { Toaster } from "~/src/presentation/components/shadcn/sonner"

import { DATAGRID_PREFS_INIT_SCRIPT } from "~/src/presentation/components/custom/datagrid/datagrid-init"
import { isAdminPathname } from "~/src/presentation/components/custom/pages/admin/lib/admin-route"
import { VerificationToast } from "~/src/presentation/components/custom/pages/auth/verification-toast"
import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"

import criticalFontsCss from "~/src/presentation/styles/critical-fonts.css?raw"
import globalsCss from "~/src/presentation/styles/globals.css?url"

import { getCriticalFontPreloads } from "~/src/presentation/document-assets"

const RootComponent = () => {
  const { internalPathname } = Route.useRouteContext()
  const isAdmin = isAdminPathname(internalPathname)

  return (
    <Tooltip.Provider delay={0}>
      {isAdmin ? (
        <Outlet />
      ) : (
        <SmoothScroll>
          <Outlet />
        </SmoothScroll>
      )}
      <VerificationToast />
      <Toaster variant={isAdmin ? "admin" : "default"} />
    </Tooltip.Provider>
  )
}

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => {
  const locale = getCurrentLocale()
  const isAdmin = isAdminPathname(getCurrentPathname())
  const nonce = useRouter().options.ssr?.nonce

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
        <script nonce={nonce} dangerouslySetInnerHTML={THEME_INIT_SCRIPT_HTML} />
        <script nonce={nonce} dangerouslySetInnerHTML={SIDEBAR_INIT_SCRIPT_HTML} />
        <script nonce={nonce} dangerouslySetInnerHTML={DATAGRID_PREFS_INIT_SCRIPT_HTML} />
        {!isAdmin && <style dangerouslySetInnerHTML={CRITICAL_FONTS_STYLE_HTML} />}
        <HeadContent />
      </head>
      <body>
        <TranslationsProvider locale={locale}>
          <ThemesProvider>{children}</ThemesProvider>
        </TranslationsProvider>
        <Scripts />
      </body>
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

const CRITICAL_FONTS_STYLE_HTML = {
  __html: criticalFontsCss,
}

const PRODUCTION = "production"

const NO_INDEX_META = [{ content: "noindex, nofollow", name: "robots" }]

interface RouterContext {
  imagePrefetchService: ImagePrefetchService
  queryClient: QueryClient
}

interface RootRouteContext {
  internalPathname: string
  locale: SupportedLocale
}

const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location, matches }): Promise<RootRouteContext> => {
    const locale = getCurrentLocale()
    await Promise.all([
      preloadNamespaces({
        locale,
        namespaces: getRouteNamespaces(matches),
        queryClient: context.queryClient,
      }),
      context.queryClient.query(displayPreferencesQuery),
    ])

    return {
      internalPathname: location.pathname,
      locale,
    }
  },
  component: RootComponent,
  shellComponent: RootDocument,
  head: ({ match }) => {
    const appUrl = APP_URL
    const rootContext: Partial<RootRouteContext> = match.context
    const path = rootContext.internalPathname ?? "/"
    const locale = rootContext.locale ?? I18N.DEFAULT_LOCALE
    const localizedPath = localizePathname({ locale, pathname: path })
    const canonicalUrl = `${appUrl}${localizedPath}`
    const imageUrl = `${appUrl}${OG_IMAGE_PATH}`
    const indexable = import.meta.env.MODE === PRODUCTION && !isNoIndexPathname(path)
    const adminCriticalStyle = [adminShellCriticalStyle(path), adminSidebarCollapsedCriticalStyle(path)].filter(Boolean).join("")

    return {
      links: [
        {
          href: globalsCss,
          rel: "stylesheet",
        },
        ...(isAdminPathname(path) ? [] : getCriticalFontPreloads(locale)),
        {
          href: APP_ICON,
          rel: "icon",
          type: "image/svg+xml",
        },
        {
          href: APP_ICON,
          rel: "apple-touch-icon",
        },
        ...localeLinks({
          origin: appUrl,
          pathname: localizedPath,
        }),
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
        ...(indexable ? [] : NO_INDEX_META),
        {
          content: THEME_COLOR,
          name: "theme-color",
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
          content: canonicalUrl,
          property: "og:url",
        },
        {
          content: locale,
          property: "og:locale",
        },
        ...I18N.SUPPORTED_LOCALES.filter((alternate) => alternate !== locale).map((alternate) => ({
          content: alternate,
          property: "og:locale:alternate",
        })),
        {
          content: imageUrl,
          property: "og:image",
        },
        {
          content: OG_IMAGE_WIDTH,
          property: "og:image:width",
        },
        {
          content: OG_IMAGE_HEIGHT,
          property: "og:image:height",
        },
        {
          content: APP_NAME,
          property: "og:image:alt",
        },
        {
          content: "summary_large_image",
          name: "twitter:card",
        },
        {
          content: imageUrl,
          name: "twitter:image",
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
