import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { isAdminPathname } from "~/src/lib/admin-route"

/** Shared by {@link writeSidebarPreference}, localStorage, and the admin init script. */
export const SIDEBAR_STORAGE_KEY = "sidebar_state"

export const SIDEBAR_PREFERENCE_CHANGE_EVENT = "sidebar-preference-change"

const SIDEBAR_COOKIE_REGEX = new RegExp(String.raw`(?:^|;\s*)${SIDEBAR_STORAGE_KEY}=([^;]*)`, "u")
const SIDEBAR_ICON_WIDTH = "4rem"

/**
 * Runs in `<head>` on admin routes before paint: syncs localStorage → cookie and applies
 * collapsed layout via `data-sidebar-collapsed` so SSR does not flash expanded when stored state is closed.
 */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(p.indexOf("/admin")===-1)return;var v=localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)});if(v===null)return;document.cookie=${JSON.stringify(SIDEBAR_STORAGE_KEY)}+"="+v+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");if(v==="0")document.documentElement.setAttribute("data-sidebar-collapsed","")}catch(e){}})();`

export const parseSidebarPreference = (cookieHeader: string | undefined, defaultOpen = true): boolean => {
  if (cookieHeader === undefined) {
    return defaultOpen
  }
  const [, rawValue] = SIDEBAR_COOKIE_REGEX.exec(cookieHeader) ?? []
  if (rawValue === undefined) {
    return defaultOpen
  }
  const value = decodeURIComponent(rawValue)
  if (value === "1") {
    return true
  }
  if (value === "0") {
    return false
  }
  return defaultOpen
}

export const readSidebarPreference = (defaultOpen = true): boolean => {
  if (typeof localStorage !== "undefined") {
    try {
      const stored = globalThis.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (stored !== null) {
        return stored === "1"
      }
    } catch {
      // Fall back to the cookie when storage is unavailable.
    }
  }
  if (typeof document !== "undefined") {
    return parseSidebarPreference(globalThis.document.cookie, defaultOpen)
  }
  return defaultOpen
}

export const writeSidebarPreference = (open: boolean): void => {
  const value = open ? "1" : "0"
  if (typeof localStorage !== "undefined") {
    try {
      globalThis.localStorage.setItem(SIDEBAR_STORAGE_KEY, value)
    } catch {
      // Cookie persistence still works when localStorage is unavailable.
    }
  }
  if (typeof document === "undefined") {
    return
  }
  const secure = globalThis.location.protocol === "https:" ? "; Secure" : ""
  globalThis.document.cookie = `${SIDEBAR_STORAGE_KEY}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
  if (open) {
    delete globalThis.document.documentElement.dataset["sidebarCollapsed"]
  } else {
    globalThis.document.documentElement.dataset["sidebarCollapsed"] = ""
  }
  globalThis.dispatchEvent(new Event(SIDEBAR_PREFERENCE_CHANGE_EVENT))
}

/** Critical CSS: collapsed sidebar width before the React bundle hydrates. */
export const adminSidebarCollapsedCriticalStyle = (pathname: string): string => {
  if (!isAdminPathname(pathname)) {
    return ""
  }
  return `html[data-admin-shell][data-sidebar-collapsed] [data-slot="sidebar-gap"]{width:${SIDEBAR_ICON_WIDTH}!important}html[data-admin-shell][data-sidebar-collapsed] [data-slot="sidebar-container"]{width:${SIDEBAR_ICON_WIDTH}!important}`
}

export const getAdminSidebarDefaultOpen = createIsomorphicFn()
  .server((): boolean => {
    const cookie = getRequest().headers.get("cookie") ?? undefined
    return parseSidebarPreference(cookie)
  })
  .client((): boolean => readSidebarPreference())
