import * as matchers from "@testing-library/jest-dom/matchers"
import { configure } from "@testing-library/react"
import { afterAll, expect, vi } from "vite-plus/test"

import { StubIntersectionObserver } from "~/src/platform/testing/mocks/intersection-observer"
import { StubResizeObserver } from "~/src/platform/testing/mocks/resize-observer"

expect.extend(matchers)

const ASYNC_QUERY_TIMEOUT_MS = 5000

const COMPONENT_TEST_TIMEOUT_MS = 15_000

configure({ asyncUtilTimeout: ASYNC_QUERY_TIMEOUT_MS })
vi.setConfig({ testTimeout: COMPONENT_TEST_TIMEOUT_MS })

const nativeSetInterval = globalThis.setInterval
const fileIntervals = new Set<ReturnType<typeof setInterval>>()

Object.defineProperty(globalThis, "setInterval", {
  configurable: true,
  value: <TArgs extends unknown[]>(handler: (...args: TArgs) => void, timeout?: number, ...args: TArgs) => {
    const interval = nativeSetInterval(handler, timeout, ...args)
    fileIntervals.add(interval)

    return interval
  },
  writable: true,
})

afterAll(() => {
  for (const interval of fileIntervals) {
    clearInterval(interval)
  }
  Object.defineProperty(globalThis, "setInterval", { configurable: true, value: nativeSetInterval, writable: true })
})

vi.stubGlobal("IntersectionObserver", StubIntersectionObserver)
vi.stubGlobal("ResizeObserver", StubResizeObserver)
Object.defineProperties(HTMLDialogElement.prototype, {
  close: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open")
      this.dispatchEvent(new Event("close"))
    },
  },
  showModal: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "")
    },
  },
})
Object.defineProperty(Document.prototype, "elementFromPoint", { configurable: true, value: () => null })

vi.stubGlobal("matchMedia", (query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
}))

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/")) }
})
