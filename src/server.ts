import handler from "@tanstack/react-start/server-entry";

import { createCookieHeader, handleLocaleMiddleware } from "~/src/integrations/use-intl/i18n.middleware";

import { generateSitemapXml } from "~/src/lib/utils";

export interface RequestContext {
  env: Env;
  passThroughOnException: () => void;
  waitUntil: (promise: Readonly<Promise<unknown>>) => void;
}

declare module "@tanstack/react-start" {
  interface Register {
    server: { requestContext: RequestContext };
  }
}

function sitemapResponse(origin: string): Response {
  return new Response(generateSitemapXml(origin), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}

interface ReadonlyCookieResponseOptions {
  readonly body: BodyInit | null;
  readonly status: number;
  readonly statusText: string;
  readonly headers: readonly (readonly [string, string])[];
}

function withCookieHeader(options: ReadonlyCookieResponseOptions, setCookie: Readonly<{ name: string; value: string }>): Response {
  const cookieValue = createCookieHeader(setCookie.name, setCookie.value);
  const newHeaders = new Headers();
  for (const [key, value] of options.headers) {
    newHeaders.set(key, value);
  }
  newHeaders.append("Set-Cookie", cookieValue);
  return new Response(options.body, {
    headers: newHeaders,
    status: options.status,
    statusText: options.statusText
  });
}

const server: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
    const { origin, pathname } = new URL(request.url);

    if (pathname === "/sitemap.xml") {
      return sitemapResponse(origin);
    }

    const { redirect, setCookie } = handleLocaleMiddleware(request);

    if (redirect) {
      return redirect;
    }

    const response = await handler.fetch(request, {
      context: {
        env,
        passThroughOnException: ctx.passThroughOnException.bind(ctx),
        waitUntil: ctx.waitUntil.bind(ctx)
      }
    });

    if (!setCookie) {
      return response;
    }

    return withCookieHeader(
      {
        body: response.body,
        headers: [...response.headers],
        status: response.status,
        statusText: response.statusText
      },
      setCookie
    );
  }
};

export default server;
