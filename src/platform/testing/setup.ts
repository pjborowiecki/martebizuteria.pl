import * as matchers from "@testing-library/jest-dom/matchers"
import { expect, vi } from "vite-plus/test"

import { StubIntersectionObserver } from "~/src/platform/testing/mocks/intersection-observer"
import { StubResizeObserver } from "~/src/platform/testing/mocks/resize-observer"

expect.extend(matchers)

vi.stubGlobal("IntersectionObserver", StubIntersectionObserver)
vi.stubGlobal("ResizeObserver", StubResizeObserver)
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
