import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { readCookie, serializeCookie } from "~/src/lib/cookie"

import { isAdminPathname } from "~/src/presentation/components/custom/pages/admin/lib/admin-route"

export const SIDEBAR_STORAGE_KEY = "sidebar_state"

export const SIDEBAR_PREFERENCE_CHANGE_EVENT = "sidebar-preference-change"

const SIDEBAR_ICON_WIDTH = "4rem"

export const SIDEBAR_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(p.indexOf("/admin")===-1)return;var v=localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)});if(v===null)return;document.cookie=${JSON.stringify(SIDEBAR_STORAGE_KEY)}+"="+v+"; Path=/; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");if(v==="0")document.documentElement.setAttribute("data-sidebar-collapsed","")}catch(e){}})();`

export const parseSidebarPreference = (cookieHeader: string | null | undefined, defaultOpen = true): boolean => {
  const value = readCookie({ header: cookieHeader, name: SIDEBAR_STORAGE_KEY })
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
    } catch {}
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
    } catch {}
  }

  if (typeof document === "undefined") {
    return
  }

  globalThis.document.cookie = serializeCookie({ name: SIDEBAR_STORAGE_KEY, value })
  if (open) {
    delete globalThis.document.documentElement.dataset["sidebarCollapsed"]
  } else {
    globalThis.document.documentElement.dataset["sidebarCollapsed"] = ""
  }
  globalThis.dispatchEvent(new Event(SIDEBAR_PREFERENCE_CHANGE_EVENT))
}

export const adminSidebarCollapsedCriticalStyle = (pathname: string): string => {
  if (!isAdminPathname(pathname)) {
    return ""
  }

  return `html[data-admin-shell][data-sidebar-collapsed] [data-slot="sidebar-gap"]{width:${SIDEBAR_ICON_WIDTH}!important}html[data-admin-shell][data-sidebar-collapsed] [data-slot="sidebar-container"]{width:${SIDEBAR_ICON_WIDTH}!important}`
}

export const getAdminSidebarDefaultOpen = createIsomorphicFn()
  .server((): boolean => parseSidebarPreference(getRequest().headers.get("cookie")))
  .client((): boolean => readSidebarPreference())
