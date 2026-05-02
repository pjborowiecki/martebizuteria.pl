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
import { buildLocalizedUrl, extractLocaleFromPath, getBaseURL } from "~/src/lib/utils";

import { Toaster } from "~/src/components/shadcn/sonner";

import { CustomCursor } from "~/src/components/custom/custom-cursor";

// eslint-disable-next-line import/no-unassigned-import
import "~/src/styles/globals.css";

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

    return {
      links: [
        { href: "https://fonts.googleapis.com", rel: "preconnect" },
        { crossOrigin: "anonymous", href: "https://fonts.gstatic.com", rel: "preconnect" },
        {
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@300;400;500;600;700&display=swap",
          rel: "stylesheet"
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
      ]
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
  const { locale } = Route.useLoaderData();

  return (
    <TranslationsProvider locale={locale}>
      <ThemesProvider>
        <TooltipProvider>
          <RootDocument locale={locale}>
            <Outlet />
            <Toaster />
            <Scripts />
          </RootDocument>
        </TooltipProvider>
      </ThemesProvider>
    </TranslationsProvider>
  );
}

function RootDocument({ children, locale }: Readonly<{ children: ReactNode; locale: Locale }>) {
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}

export { Route };
