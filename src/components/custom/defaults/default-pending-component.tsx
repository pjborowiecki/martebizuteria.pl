import type { JSX } from "react";

import { useRouterState } from "@tanstack/react-router";

import { TranslationsProvider } from "~/src/providers/translations-provider";

import { cn, isAdminPathname } from "~/src/lib/utils";

function PendingShell(): JSX.Element {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isAdminPathname(pathname)) {
    // Keep admin chrome visible; child routes use Suspense fallbacks for dynamic regions.
    return <div className="min-h-0" aria-hidden />;
  }

  return <div className={cn("min-h-svh w-full bg-background")} aria-busy="true" aria-label="Loading" />;
}

export function DefaultPendingComponent(): JSX.Element {
  return (
    <TranslationsProvider>
      <PendingShell />
    </TranslationsProvider>
  );
}
