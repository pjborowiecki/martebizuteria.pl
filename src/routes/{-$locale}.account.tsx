import { type JSX, Suspense, useMemo } from "react";

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { AccountSidebar } from "~/src/components/custom/account/account-sidebar";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

import { getSessionFn } from "~/src/modules/session/session.actions";

interface AccountPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/account")({
  beforeLoad: async () => {
    const session = await getSessionFn();

    if (!session?.user) {
      redirect({
        throw: true,
        to: `/{-$locale}${CONSTANTS.ROUTES.AUTH_SIGN_IN}`
      });
      throw new Error("Redirecting");
    }

    return { user: session.user };
  },
  component: AccountLayout,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<AccountPageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: ({ context, params }) => {
    const { locale: rawLocale } = params;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    const messages = context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey);

    return {
      description: messages?.accountPage.description ?? "",
      title: messages?.accountPage.title ?? CONSTANTS.APP_NAME
    } satisfies AccountPageMeta;
  }
});

function AccountSidebarFallback(): JSX.Element {
  return (
    <aside className="hidden lg:sticky lg:top-28 lg:block lg:w-[220px] lg:shrink-0 lg:self-start" aria-hidden>
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={`sk-${String(i)}`} className="h-9 animate-pulse rounded-md bg-muted/35" />
        ))}
      </div>
    </aside>
  );
}

function AccountMainFallback(): JSX.Element {
  return (
    <div className="min-h-[50vh] min-w-0 animate-pulse space-y-6" aria-hidden>
      <div className="h-3 w-36 rounded bg-muted" />
      <div className="h-10 max-w-sm rounded bg-muted/80" />
      <div className="h-24 rounded-lg bg-muted/40" />
    </div>
  );
}

function AccountLayout(): JSX.Element {
  const sidebarFallback = useMemo(() => <AccountSidebarFallback />, []);
  const mainFallback = useMemo(() => <AccountMainFallback />, []);

  return (
    <>
      <Navigation />
      <main className="mx-auto max-w-400 flex-1 px-6 font-light lg:px-12">
        <div className="grid gap-x-16 gap-y-10 py-12 lg:grid-cols-[220px_1fr] lg:py-20 lg:pl-[116px]">
          <Suspense fallback={sidebarFallback}>
            <AccountSidebar />
          </Suspense>
          <Suspense fallback={mainFallback}>
            <div className="min-w-0 lg:min-h-[600px]">
              <Outlet />
            </div>
          </Suspense>
        </div>
      </main>
    </>
  );
}
