import { isAdminPathname } from "~/src/lib/admin-route"

import { APP_NAME } from "~/src/presentation/branding/app"

import { ADMIN_SHELL_CHROME_BG } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

/** Apply the admin background before the CSS bundle loads. */
export const adminShellCriticalStyle = (pathname: string): string | undefined => {
  if (!isAdminPathname(pathname)) {
    return undefined
  }
  return `html[data-admin-shell],html[data-admin-shell] body{background-color:${ADMIN_SHELL_CHROME_BG}}`
}
export const THEME_STORAGE_KEY = `${APP_NAME}-theme`

/** Apply the stored theme and admin background before paint to prevent flashing. */
const ADMIN_CHROME_BG_JSON = JSON.stringify(ADMIN_SHELL_CHROME_BG)
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==="dark";var p=location.pathname;var a=p.indexOf("/admin")!==-1;var c=${ADMIN_CHROME_BG_JSON};if(a){document.documentElement.classList.remove("dark");document.documentElement.dataset.adminShell="";document.documentElement.style.backgroundColor=c;document.body.style.backgroundColor=c}else if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`
