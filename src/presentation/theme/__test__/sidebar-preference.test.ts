import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { getRequest, runtime } = vi.hoisted(() => ({
  getRequest: vi.fn(() => new Request("https://store.test/admin")),
  runtime: { client: false },
}))

vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    server: (server: () => boolean) => ({ client: (client: () => boolean) => () => (runtime.client ? client() : server()) }),
  }),
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest }))

import {
  SIDEBAR_INIT_SCRIPT,
  SIDEBAR_PREFERENCE_CHANGE_EVENT,
  SIDEBAR_STORAGE_KEY,
  adminSidebarCollapsedCriticalStyle,
  getAdminSidebarDefaultOpen,
  parseSidebarPreference,
  readSidebarPreference,
  writeSidebarPreference,
} from "~/src/presentation/theme/sidebar-preference"

const createStorage = (initial?: string): Storage => {
  const entries = new Map<string, string>(initial === undefined ? [] : [[SIDEBAR_STORAGE_KEY, initial]])

  return {
    clear: () => {
      entries.clear()
    },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
  }
}

describe("parseSidebarPreference", () => {
  it("reads the open and closed cookie values", () => {
    expect(parseSidebarPreference(`${SIDEBAR_STORAGE_KEY}=1`)).toBe(true)
    expect(parseSidebarPreference(`${SIDEBAR_STORAGE_KEY}=0`)).toBe(false)
  })

  it.each([[null], [undefined], [""], ["other=1"], [`${SIDEBAR_STORAGE_KEY}=maybe`]])(
    "falls back to the default for the header %j",
    (header) => {
      expect(parseSidebarPreference(header)).toBe(true)
      expect(parseSidebarPreference(header, false)).toBe(false)
    },
  )
})

describe("readSidebarPreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("prefers the stored value over the cookie", () => {
    vi.stubGlobal("localStorage", createStorage("0"))
    vi.stubGlobal("document", { cookie: `${SIDEBAR_STORAGE_KEY}=1` })

    expect(readSidebarPreference()).toBe(false)
  })

  it("falls back to the cookie when nothing is stored", () => {
    vi.stubGlobal("localStorage", createStorage())
    vi.stubGlobal("document", { cookie: `${SIDEBAR_STORAGE_KEY}=0` })

    expect(readSidebarPreference()).toBe(false)
  })

  it("falls back to the cookie when storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError")
      },
    })
    vi.stubGlobal("document", { cookie: `${SIDEBAR_STORAGE_KEY}=0` })

    expect(readSidebarPreference()).toBe(false)
  })

  it("falls back to the caller's default on the server, where neither exists", () => {
    expect(readSidebarPreference()).toBe(true)
    expect(readSidebarPreference(false)).toBe(false)
  })
})

describe("writeSidebarPreference", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { protocol: "http:" })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("does nothing beyond storage when there is no document", () => {
    const storage = createStorage()
    vi.stubGlobal("localStorage", storage)

    writeSidebarPreference(false)

    expect(storage.getItem(SIDEBAR_STORAGE_KEY)).toBe("0")
  })

  it("writes the cookie even when the browser has no storage API", () => {
    const documentStub = { cookie: "", documentElement: { dataset: {} as Record<string, string> } }
    vi.stubGlobal("localStorage", undefined)
    vi.stubGlobal("document", documentStub)
    vi.stubGlobal("dispatchEvent", vi.fn())

    writeSidebarPreference(false)

    expect(documentStub.cookie).toContain(`${SIDEBAR_STORAGE_KEY}=0`)
    expect(documentStub.documentElement.dataset["sidebarCollapsed"]).toBe("")
  })

  it("writes the cookie, the collapsed attribute and announces the change", () => {
    const storage = createStorage()
    const dataset: Record<string, string> = {}
    const documentStub = { cookie: "", documentElement: { dataset } }
    const dispatchEvent = vi.fn()

    vi.stubGlobal("localStorage", storage)
    vi.stubGlobal("document", documentStub)
    vi.stubGlobal("dispatchEvent", dispatchEvent)

    writeSidebarPreference(false)

    expect(storage.getItem(SIDEBAR_STORAGE_KEY)).toBe("0")
    expect(documentStub.cookie).toContain(`${SIDEBAR_STORAGE_KEY}=0`)
    expect(dataset["sidebarCollapsed"]).toBe("")
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it("only marks the cookie Secure on a page served over HTTPS", () => {
    const documentStub = { cookie: "", documentElement: { dataset: {} as Record<string, string> } }
    vi.stubGlobal("localStorage", undefined)
    vi.stubGlobal("document", documentStub)
    vi.stubGlobal("dispatchEvent", vi.fn())

    writeSidebarPreference(false)
    expect(documentStub.cookie).not.toContain("Secure")

    vi.stubGlobal("location", { protocol: "https:" })
    writeSidebarPreference(false)
    expect(documentStub.cookie).toContain("Secure")
  })

  it("clears the collapsed attribute when the sidebar reopens", () => {
    const dataset: Record<string, string> = { sidebarCollapsed: "" }

    vi.stubGlobal("localStorage", createStorage())
    vi.stubGlobal("document", { cookie: "", documentElement: { dataset } })
    vi.stubGlobal("dispatchEvent", vi.fn())

    writeSidebarPreference(true)

    expect(dataset["sidebarCollapsed"]).toBeUndefined()
  })

  it("still writes the cookie when storage refuses", () => {
    const documentStub = { cookie: "", documentElement: { dataset: {} as Record<string, string> } }

    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
    })
    vi.stubGlobal("document", documentStub)
    vi.stubGlobal("dispatchEvent", vi.fn())

    writeSidebarPreference(true)

    expect(documentStub.cookie).toContain(`${SIDEBAR_STORAGE_KEY}=1`)
  })

  it("round trips through the reader", () => {
    const storage = createStorage()

    vi.stubGlobal("localStorage", storage)
    vi.stubGlobal("document", { cookie: "", documentElement: { dataset: {} as Record<string, string> } })
    vi.stubGlobal("dispatchEvent", vi.fn())

    writeSidebarPreference(false)

    expect(readSidebarPreference()).toBe(false)
  })
})

describe("adminSidebarCollapsedCriticalStyle", () => {
  it("emits nothing outside the admin shell", () => {
    expect(adminSidebarCollapsedCriticalStyle("/")).toBe("")
    expect(adminSidebarCollapsedCriticalStyle("/products/silver-ring")).toBe("")
  })

  it("narrows both sidebar slots on admin routes", () => {
    const style = adminSidebarCollapsedCriticalStyle("/admin/orders")

    expect(style).toContain('[data-slot="sidebar-gap"]')
    expect(style).toContain('[data-slot="sidebar-container"]')
    expect(style).toContain("4rem")
  })
})

describe("SIDEBAR_INIT_SCRIPT", () => {
  it("bails out on non-admin routes before touching storage", () => {
    expect(SIDEBAR_INIT_SCRIPT).toContain('indexOf("/admin")===-1')
  })

  it("mirrors localStorage into the cookie under the shared key", () => {
    expect(SIDEBAR_INIT_SCRIPT).toContain(JSON.stringify(SIDEBAR_STORAGE_KEY))
    expect(SIDEBAR_INIT_SCRIPT).toContain("SameSite=Lax")
  })

  it("applies the collapsed attribute for a stored closed sidebar", () => {
    expect(SIDEBAR_INIT_SCRIPT).toContain('setAttribute("data-sidebar-collapsed"')
  })

  it("names an event the client can listen for", () => {
    expect(SIDEBAR_PREFERENCE_CHANGE_EVENT).toBe("sidebar-preference-change")
  })
})

describe("getAdminSidebarDefaultOpen", () => {
  afterEach(() => {
    runtime.client = false
    vi.unstubAllGlobals()
  })

  it("uses the persisted browser preference on the client", () => {
    runtime.client = true
    vi.stubGlobal("localStorage", createStorage("0"))

    expect(getAdminSidebarDefaultOpen()).toBe(false)
  })

  it("opens the sidebar for a request that carries no preference", () => {
    expect(getAdminSidebarDefaultOpen()).toBe(true)
  })

  it("renders the sidebar collapsed when the request cookie stored a closed sidebar", () => {
    getRequest.mockReturnValue(new Request("https://store.test/admin", { headers: { cookie: `${SIDEBAR_STORAGE_KEY}=0` } }))

    expect(getAdminSidebarDefaultOpen()).toBe(false)
  })

  it("renders the sidebar open when the request cookie stored an open sidebar", () => {
    getRequest.mockReturnValue(new Request("https://store.test/admin", { headers: { cookie: `${SIDEBAR_STORAGE_KEY}=1` } }))

    expect(getAdminSidebarDefaultOpen()).toBe(true)
  })
})
