/// <reference types="vite/client" />

import type { ReactNode } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { ThemesProvider } from "~/src/providers/themes-provider";
import { TooltipProvider } from "~/src/providers/tooltip-provider";
import { TranslationsProvider } from "~/src/providers/translations-provider";

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import type { ImagePrefetchService } from "~/src/lib/_utils/image";
import { isAdminPathname } from "~/src/lib/admin-route";
import { DATAGRID_PREFS_INIT_SCRIPT } from "~/src/lib/datagrid-init-script";
import { adminShellCriticalStyle, THEME_INIT_SCRIPT } from "~/src/lib/theme-init-script";
import { buildLocalizedUrl, extractLocaleFromPath, getBaseURL } from "~/src/lib/utils";

import { Toaster } from "~/src/components/shadcn/sonner";

import { VerificationToast } from "~/src/components/custom/pages/auth/verification-toast";

import "~/src/styles/globals.css";

const THEME_INIT_SCRIPT_HTML = { __html: THEME_INIT_SCRIPT };
const DATAGRID_PREFS_INIT_SCRIPT_HTML = { __html: DATAGRID_PREFS_INIT_SCRIPT };

interface RouterContext {
  imagePrefetchService: ImagePrefetchService;
  queryClient: QueryClient;
}

interface RootLoaderData {
  internalPathname: string;
  locale: Locale;
}

const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<RootLoaderData> }>) => {
    const appUrl = getBaseURL();

    const path = loaderData?.internalPathname ?? "/";
    const locale = loaderData?.locale ?? CONSTANTS.DEFAULT_LOCALE;

    const canonicalUrl = buildLocalizedUrl(appUrl, path, locale);
    const xDefaultUrl = buildLocalizedUrl(appUrl, path, CONSTANTS.DEFAULT_LOCALE);
    const adminCriticalStyle = adminShellCriticalStyle(path);

    return {
      links: [
        {
          as: "font",
          crossOrigin: "anonymous",
          href: "/fonts/manrope-latin-wght-normal.woff2",
          rel: "preload",
          type: "font/woff2"
        },
        {
          as: "font",
          crossOrigin: "anonymous",
          href: "/fonts/cormorant-garamond-latin-400-normal.woff2",
          rel: "preload",
          type: "font/woff2"
        },
        { href: canonicalUrl, rel: "canonical" },
        ...CONSTANTS.LOCALES.map((loc) => ({
          href: buildLocalizedUrl(appUrl, path, loc),
          hrefLang: loc,
          rel: "alternate"
        })),
        { href: xDefaultUrl, hrefLang: "x-default", rel: "alternate" }
      ],
      meta: [
        { charSet: "utf8" },
        { title: CONSTANTS.APP_NAME },
        { content: "width=device-width, initial-scale=1", name: "viewport" },
        { content: "Handcrafted jewellery by M'Arte.", name: "description" },
        { content: "website", property: "og:type" },
        { content: CONSTANTS.APP_NAME, property: "og:site_name" },
        { content: locale, property: "og:locale" },
        { content: "summary_large_image", name: "twitter:card" }
      ],
      styles: adminCriticalStyle === undefined ? undefined : [{ children: adminCriticalStyle }]
    };
  },
  loader: async ({ context, location }) => {
    const publicPathname = new URL(location.publicHref, "http://x").pathname;
    const locale: Locale = extractLocaleFromPath(publicPathname) ?? CONSTANTS.DEFAULT_LOCALE;

    await context.queryClient.ensureQueryData(messagesQueryOptions(locale));

    return { internalPathname: location.pathname, locale };
  }
});

function RootComponent() {
  const { internalPathname, locale } = Route.useLoaderData();

  return (
    <TranslationsProvider locale={locale}>
      <ThemesProvider>
        <TooltipProvider>
          <RootDocument internalPathname={internalPathname} locale={locale}>
            <Outlet />
            <VerificationToast />
            <Toaster />
            <Scripts />
          </RootDocument>
        </TooltipProvider>
      </ThemesProvider>
    </TranslationsProvider>
  );
}

function RootDocument({ children, internalPathname, locale }: Readonly<{ children: ReactNode; internalPathname: string; locale: Locale }>) {
  const isAdmin = isAdminPathname(internalPathname);

  return (
    <html lang={locale} suppressHydrationWarning {...(isAdmin ? { "data-admin-shell": "" } : {})}>
      <head>
        <script dangerouslySetInnerHTML={THEME_INIT_SCRIPT_HTML} />
        <script dangerouslySetInnerHTML={DATAGRID_PREFS_INIT_SCRIPT_HTML} />
        <HeadContent />
      </head>
      <body>{children}</body>
    </html>
  );
}

export { Route };
