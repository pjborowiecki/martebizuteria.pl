import { useEffect } from "react";

import { THEME_STORAGE_KEY } from "~/src/lib/theme-init-script";

/** Keeps the admin shell on a light canvas while the storefront may use dark mode. */
export function useAdminLightTheme(): void {
  useEffect(function syncAdminLightTheme() {
    document.documentElement.classList.remove("dark");

    return function restoreStorefrontTheme() {
      try {
        if (globalThis.localStorage?.getItem(THEME_STORAGE_KEY) === "dark") {
          document.documentElement.classList.add("dark");
        }
      } catch {
        // localStorage may be unavailable
      }
    };
  }, []);
}
