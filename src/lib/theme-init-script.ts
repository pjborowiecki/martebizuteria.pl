import { CONSTANTS } from "~/src/constants";

import { isAdminPathname } from "~/src/lib/admin-route";

/** Must match {@link ThemesProvider} `storageKey`. */
export const THEME_STORAGE_KEY = `${CONSTANTS.APP_NAME}-theme`;

/**
 * Runs before paint to apply the stored theme and admin shell background.
 * Prevents light SSR markup flashing to dark gray when `localStorage` theme differs.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==="dark";var p=location.pathname;var a=p.indexOf("/admin")!==-1;if(a){document.documentElement.classList.remove("dark");document.documentElement.dataset.adminShell="";document.documentElement.style.backgroundColor="#f4f4f5";document.body.style.backgroundColor="#f4f4f5"}else if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`;

/** Inline critical admin shell background (runs before CSS bundle). */
export function adminShellCriticalStyle(pathname: string): string | undefined {
  if (!isAdminPathname(pathname)) {
    return undefined;
  }

  return "html[data-admin-shell],html[data-admin-shell] body{background-color:#f4f4f5}";
}
