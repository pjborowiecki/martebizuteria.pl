import { type JSX, useLayoutEffect, useRef } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"

import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const gsapModule = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const contexts: { added: number; reverts: number; scope: unknown }[] = []
  const state: { loaded: boolean; pending: Promise<unknown> | undefined; release: () => void; toolkit: unknown } = {
    loaded: false,
    pending: undefined,
    release: () => {},
    toolkit: undefined,
  }

  return {
    contexts,
    listeners,
    loadGsap: vi.fn(() => {
      state.pending ??= new Promise((resolve) => {
        state.release = () => {
          state.loaded = true
          resolve(state.toolkit)
        }
      })

      return state.pending
    }),
    state,
  }
})

vi.mock("~/src/integrations/gsap/gsap.loader", async () => {
  const { createGsapContextStub } = await import("~/src/platform/testing/mocks/gsap")
  gsapModule.state.toolkit = {
    ScrollTrigger: {},
    gsap: {
      context: (_setup: () => void, scope: unknown) => {
        const context = createGsapContextStub()
        const record = { added: 0, reverts: 0, scope }
        gsapModule.contexts.push(record)

        return {
          add: (run: () => unknown) => {
            record.added += 1

            return context.add(run)
          },
          revert: () => {
            record.reverts += 1
            context.revert()
          },
        }
      },
    },
  }

  return {
    getLoadedGsap: () => (gsapModule.state.loaded ? gsapModule.state.toolkit : undefined),
    loadGsap: gsapModule.loadGsap,
    subscribeToGsap: (listener: () => void) => {
      gsapModule.listeners.add(listener)

      return () => {
        gsapModule.listeners.delete(listener)
      }
    },
  }
})

const { useGsap, useGsapToolkit } = await import("~/src/hooks/use-gsap")

const finishLoading = (): void => {
  gsapModule.state.loaded = true
  act(() => {
    for (const listener of gsapModule.listeners) {
      listener()
    }
  })
}

const ToolkitProbe = ({ load }: Readonly<{ load: boolean }>): JSX.Element => (
  <p>{useGsapToolkit(load) === undefined ? "waiting" : "ready"}</p>
)

interface HarnessProps {
  readonly dependencies?: readonly unknown[]
  readonly load?: boolean
  readonly revertOnUpdate?: boolean
  readonly setup?: Parameters<typeof useGsap>[0]
}

const Harness = ({ dependencies, load, revertOnUpdate, setup }: HarnessProps): JSX.Element => {
  const scope = useRef<HTMLDivElement>(null)
  useGsap(setup, {
    ...(dependencies === undefined ? {} : { dependencies }),
    ...(load === undefined ? {} : { load }),
    ...(revertOnUpdate === undefined ? {} : { revertOnUpdate }),
    scope,
  })

  return <div ref={scope} />
}

const HydratedPage = ({ onCommit, setup }: Readonly<{ onCommit: () => void; setup: () => void }>): JSX.Element => {
  useLayoutEffect(onCommit, [onCommit])

  return <Harness setup={setup} />
}

beforeEach(() => {
  gsapModule.state.loaded = false
  gsapModule.state.pending = undefined
  gsapModule.contexts.length = 0
  gsapModule.loadGsap.mockClear()
})

afterEach(() => {
  cleanup()
})

describe("useGsapToolkit", () => {
  it("renders on the server without the animation library, which nothing loads there", () => {
    expect(renderToString(<ToolkitProbe load />)).toBe("<p>waiting</p>")
    expect(gsapModule.loadGsap).not.toHaveBeenCalled()
  })

  it("asks for the animation library once the component has mounted", () => {
    render(<ToolkitProbe load />)

    expect(gsapModule.loadGsap).toHaveBeenCalledTimes(1)
  })

  it("leaves the library unloaded while the component does not need it", () => {
    render(<ToolkitProbe load={false} />)

    expect(gsapModule.loadGsap).not.toHaveBeenCalled()
  })

  it("hands over the library that another component loaded", () => {
    const { container } = render(<ToolkitProbe load={false} />)
    finishLoading()

    expect(container).toHaveTextContent("ready")
  })
})

describe("useGsap", () => {
  it("runs nothing until the library has loaded", () => {
    const setup = vi.fn()
    render(<Harness setup={setup} />)

    expect(setup).not.toHaveBeenCalled()
  })

  it("runs the setup once the library has loaded, in a context scoped to the component", () => {
    const setup = vi.fn()
    const { container } = render(<Harness setup={setup} />)
    finishLoading()

    expect(setup).toHaveBeenCalledWith(gsapModule.state.toolkit)
    expect(gsapModule.contexts).toHaveLength(1)
    expect(gsapModule.contexts[0]?.scope).toStrictEqual({ current: container.firstChild })
  })

  it("runs the setup straight away when the library is already there", () => {
    gsapModule.state.loaded = true
    const setup = vi.fn()
    render(<Harness setup={setup} />)

    expect(setup).toHaveBeenCalledTimes(1)
  })

  it("keeps a context without a setup, for handlers alone", () => {
    gsapModule.state.loaded = true
    render(<Harness />)

    expect(gsapModule.contexts).toHaveLength(1)
    expect(gsapModule.contexts[0]?.added).toBe(0)
  })

  it("does not run the setup again while its dependencies stay the same", () => {
    gsapModule.state.loaded = true
    const setup = vi.fn()
    const { rerender } = render(<Harness dependencies={["necklaces"]} setup={setup} />)
    rerender(<Harness dependencies={["necklaces"]} setup={setup} />)

    expect(setup).toHaveBeenCalledTimes(1)
  })

  it("adds a fresh run next to the earlier one when a dependency changes", () => {
    gsapModule.state.loaded = true
    const setup = vi.fn()
    const { rerender } = render(<Harness dependencies={["necklaces"]} setup={setup} />)
    rerender(<Harness dependencies={["rings"]} setup={setup} />)

    expect(setup).toHaveBeenCalledTimes(2)
    expect(gsapModule.contexts[0]?.reverts).toBe(0)
  })

  it("reverts the earlier run first when asked to revert on update", () => {
    gsapModule.state.loaded = true
    const cleanupRun = vi.fn<() => void>()
    const setup = () => cleanupRun
    const { rerender } = render(<Harness dependencies={["necklaces"]} revertOnUpdate setup={setup} />)
    rerender(<Harness dependencies={["rings"]} revertOnUpdate setup={setup} />)

    expect(cleanupRun).toHaveBeenCalledTimes(1)
    expect(gsapModule.contexts[0]?.reverts).toBe(1)
  })

  it("reverts everything it created when the component unmounts", () => {
    gsapModule.state.loaded = true
    const cleanupRun = vi.fn<() => void>()
    const setup = () => cleanupRun
    const { unmount } = render(<Harness setup={setup} />)
    unmount()

    expect(cleanupRun).toHaveBeenCalledTimes(1)
  })

  it("does not load the library on mount when told to wait", () => {
    render(<Harness load={false} setup={vi.fn()} />)

    expect(gsapModule.loadGsap).not.toHaveBeenCalled()
  })
})

describe("useGsap context-safe handlers", () => {
  it("asks for the library and does nothing when called before it has loaded", () => {
    const handler = vi.fn<(loaded: unknown, ...args: unknown[]) => void>()
    const { result } = renderHook(() => useGsap(undefined, { load: false }))

    result.current.contextSafe(handler)("necklaces")

    expect(handler).not.toHaveBeenCalled()
    expect(gsapModule.loadGsap).toHaveBeenCalledTimes(1)
  })

  it("runs inside the component's context with the library and the call's arguments", () => {
    gsapModule.state.loaded = true
    const handler = vi.fn<(loaded: unknown, ...args: unknown[]) => void>()
    const { result } = renderHook(() => useGsap(undefined, { load: false }))

    result.current.contextSafe(handler)("necklaces", 2)

    expect(handler).toHaveBeenCalledWith(gsapModule.state.toolkit, "necklaces", 2)
    expect(gsapModule.contexts.at(-1)?.added).toBe(1)
  })

  it("returns the loaded library for code outside the context", () => {
    gsapModule.state.loaded = true
    const { result } = renderHook(() => useGsap(undefined))

    expect(result.current.toolkit).toBe(gsapModule.state.toolkit)
  })
})

describe("useGsap during hydration", () => {
  it("runs the setup in the commit that hydrates the server's markup when the page brought the library with its own code", async () => {
    gsapModule.state.loaded = true
    const setup = vi.fn<() => void>()
    const setupRunsAtCommit: number[] = []
    const onCommit = (): void => {
      setupRunsAtCommit.push(setup.mock.calls.length)
    }
    const container = document.createElement("div")
    container.innerHTML = renderToString(<HydratedPage onCommit={onCommit} setup={setup} />)

    const root = await act(() => hydrateRoot(container, <HydratedPage onCommit={onCommit} setup={setup} />))

    expect(setupRunsAtCommit).toStrictEqual([1])
    act(() => {
      root.unmount()
    })
  })
})
