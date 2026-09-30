import { type JSX, useCallback, useRef } from "react"

import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import * as CONSTANTS from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import {
  type HoverOptions,
  useNavigationLogic,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-navigation-logic"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

const gsapState = vi.hoisted(() => {
  const state: {
    conditions: { desktop: boolean; reduced: boolean } | undefined
    fromTo: unknown[][]
    panelOnStart: (() => void) | undefined
    parallax: unknown[][]
    progress: number
    onReverseComplete: (() => void) | undefined
    onScrollToggle: ((trigger: { isActive: boolean }) => void) | undefined
    scrollActive: boolean
    sets: unknown[][]
    timelineActions: string[]
    to: unknown[][]
  } = {
    conditions: { desktop: true, reduced: false },
    fromTo: [],
    onReverseComplete: undefined,
    onScrollToggle: undefined,
    panelOnStart: undefined,
    parallax: [],
    progress: 0,
    scrollActive: false,
    sets: [],
    timelineActions: [],
    to: [],
  }

  return { state }
})

vi.mock("~/src/integrations/lenis/lenis.scroll", () => ({ scrollToSectionById: () => {} }))
const sameDependencies = (left: readonly unknown[], right: readonly unknown[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index])

const withScrollbar = (width: number): (() => void) => {
  Object.defineProperty(document.documentElement, "offsetWidth", { configurable: true, value: 1000 + width })
  Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1000 })

  return () => {
    Reflect.deleteProperty(document.documentElement, "offsetWidth")
    Reflect.deleteProperty(document.documentElement, "clientWidth")
  }
}

vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useEffect, useRef: useStoredDependencies } = await import("react")

  const timeline = {
    fromTo: (...args: [unknown, unknown, { onStart?: () => void }, unknown?]) => {
      gsapState.state.fromTo.push(args)
      gsapState.state.panelOnStart ??= args[2].onStart

      return timeline
    },
    kill: () => {},
    pause: () => {
      gsapState.state.timelineActions.push("pause")
    },
    paused: () => false,
    play: () => {
      gsapState.state.timelineActions.push("play")

      return timeline
    },
    progress: () => gsapState.state.progress,
    reverse: () => {
      gsapState.state.timelineActions.push("reverse")

      return timeline
    },
    timeScale: () => timeline,
  }

  return {
    ScrollTrigger: {
      create: (config: { onToggle?: (trigger: { isActive: boolean }) => void }) => {
        gsapState.state.onScrollToggle = config.onToggle

        return { isActive: gsapState.state.scrollActive }
      },
    },
    gsap: {
      fromTo: (...args: unknown[]) => {
        gsapState.state.fromTo.push(args)
      },
      matchMedia: () => ({
        add: (_media: unknown, run: (context: { conditions: { desktop: boolean; reduced: boolean } | undefined }) => unknown) => {
          run({ conditions: gsapState.state.conditions })
        },
        revert: () => {},
      }),
      quickTo: (_target: unknown, axis: string) => (value: number) => {
        gsapState.state.parallax.push([axis, value])
      },
      set: (...args: unknown[]) => {
        gsapState.state.sets.push(args)
      },
      timeline: (config: { onReverseComplete?: () => void }) => {
        gsapState.state.onReverseComplete = config.onReverseComplete

        return timeline
      },
      to: (...args: unknown[]) => {
        gsapState.state.to.push(args)
      },
    },
    useGSAP: (callback: () => unknown, config?: { dependencies?: readonly unknown[] }) => {
      const lastDependencies = useStoredDependencies<readonly unknown[] | undefined>(undefined)
      useEffect(() => {
        const dependencies = config?.dependencies ?? []
        if (lastDependencies.current !== undefined && sameDependencies(lastDependencies.current, dependencies)) {
          return
        }
        lastDependencies.current = dependencies
        callback()
      })

      return { contextSafe: <TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn) => fn }
    },
  }
})

const noop = () => {}

const NavigationHarness = ({
  hoverOptions,
  onNavigate = noop,
  withImageContainer = true,
}: Readonly<{
  hoverOptions?: HoverOptions
  onNavigate?: (opts: { hash?: string; to?: string }) => void
  withImageContainer?: boolean
}>): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  const { dismissMenuForRouteNavigation, getHoverProps, handleHover, handleMouseMove, menuOpen, mounted, scrolled, setMenuOpen } =
    useNavigationLogic(containerRef, panelRef, onNavigate)
  const hover = getHoverProps(hoverOptions)
  const detached = getHoverProps()
  const openMenu = useCallback(() => {
    setMenuOpen(true)
  }, [setMenuOpen])

  const showSecondImage = useCallback(() => {
    handleHover(2)
  }, [handleHover])

  return (
    <div ref={containerRef}>
      {withImageContainer ? <div data-menu-image-container /> : undefined}
      <div data-menu-backdrop data-testid="backdrop" />
      <dialog ref={panelRef} />
      <p>{`mounted:${String(mounted)} open:${String(menuOpen)} scrolled:${String(scrolled)}`}</p>
      <button aria-label="hover target" onMouseEnter={hover.onMouseEnter} onMouseLeave={hover.onMouseLeave} ref={hover.ref} type="button">
        target
      </button>
      <button aria-label="detached target" onMouseEnter={detached.onMouseEnter} type="button">
        detached
      </button>
      <button aria-label="parallax surface" onMouseMove={handleMouseMove} type="button">
        surface
      </button>
      <svg aria-label="vector surface" onMouseMove={handleMouseMove} />
      <button onClick={showSecondImage} type="button">
        show second image
      </button>
      <button onClick={openMenu} type="button">
        open menu
      </button>
      <button onClick={dismissMenuForRouteNavigation} type="button">
        dismiss menu
      </button>
    </div>
  )
}

const harnessState = () => screen.getByText(/^mounted:/u).textContent

const sizedSurface = () => {
  const surface = screen.getByLabelText("parallax surface")
  Object.defineProperty(surface, "clientWidth", { configurable: true, value: 200 })
  Object.defineProperty(surface, "clientHeight", { configurable: true, value: 100 })

  return surface
}

beforeEach(() => {
  gsapState.state.conditions = { desktop: true, reduced: false }
  gsapState.state.fromTo = []
  gsapState.state.onReverseComplete = undefined
  gsapState.state.onScrollToggle = undefined
  gsapState.state.panelOnStart = undefined
  gsapState.state.parallax = []
  gsapState.state.progress = 0
  gsapState.state.scrollActive = false
  gsapState.state.sets = []
  gsapState.state.timelineActions = []
  gsapState.state.to = []
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
})

afterEach(() => {
  cleanup()
})

describe("navigation menu state", () => {
  it("starts with the menu closed and unmounted", () => {
    renderWithProviders(<NavigationHarness />)

    expect(harnessState()).toBe("mounted:false open:false scrolled:false")
  })

  it("adopts the scroll trigger's state on mount", () => {
    gsapState.state.scrollActive = true
    renderWithProviders(<NavigationHarness />)

    expect(harnessState()).toContain("scrolled:true")
  })

  it("mounts the panel and plays the timeline once the menu opens", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))

    expect(harnessState()).toContain("mounted:true")
    expect(harnessState()).toContain("open:true")
    expect(gsapState.state.timelineActions).toContain("play")
  })

  it("closes the menu and drops any queued section when a route navigation starts", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))
    useNavigationStore.getState().setPendingHash("philosophy")
    await userEvent.click(screen.getByRole("button", { name: "dismiss menu" }))

    expect(useNavigationStore.getState().menuOpen).toBe(false)
    expect(useNavigationStore.getState().pendingHash).toBeUndefined()
    expect(gsapState.state.timelineActions).toContain("pause")
  })

  it("closes the menu on escape while it is open", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))
    await userEvent.keyboard("{Escape}")

    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })

  it("leaves the menu open for keys other than Escape", () => {
    renderWithProviders(<NavigationHarness />)
    act(() => {
      useNavigationStore.getState().setMenuOpen(true)
    })

    fireEvent.keyDown(document, { key: "Tab" })

    expect(useNavigationStore.getState().menuOpen).toBe(true)
  })
})

describe("navigation hover", () => {
  it("lifts and scales the hovered element with the options it was given", async () => {
    renderWithProviders(<NavigationHarness hoverOptions={{ scale: 1.5, y: -6 }} />)

    await userEvent.hover(screen.getByLabelText("hover target"))

    expect(gsapState.state.to.at(-1)).toStrictEqual([
      screen.getByLabelText("hover target"),
      { duration: CONSTANTS.HOVER_ENTER_DURATION, ease: "power2.out", overwrite: "auto", scale: 1.5, y: -6 },
    ])
  })

  it("returns the element to rest when the pointer leaves", async () => {
    renderWithProviders(<NavigationHarness hoverOptions={{ scale: 1.5, y: -6 }} />)
    const target = screen.getByLabelText("hover target")

    await userEvent.hover(target)
    await userEvent.unhover(target)

    expect(gsapState.state.to.at(-1)).toStrictEqual([
      target,
      {
        duration: CONSTANTS.HOVER_LEAVE_DURATION,
        ease: "power3.inOut",
        overwrite: "auto",
        scale: CONSTANTS.ACTIVE_SCALE,
        y: CONSTANTS.POS_IMMEDIATE,
      },
    ])
  })

  it("falls back to the default hover offsets when none are given", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.hover(screen.getByLabelText("hover target"))

    expect(gsapState.state.to.at(-1)?.[1]).toStrictEqual({
      duration: CONSTANTS.HOVER_ENTER_DURATION,
      ease: "power2.out",
      overwrite: "auto",
      scale: CONSTANTS.HOVER_SCALE,
      y: CONSTANTS.HOVER_Y_OFFSET,
    })
  })

  it("animates nothing for an element that never registered its ref", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.hover(screen.getByLabelText("detached target"))

    expect(gsapState.state.to).toStrictEqual([])
  })

  it("animates nothing for a visitor who prefers reduced motion", async () => {
    gsapState.state.conditions = { desktop: true, reduced: true }
    renderWithProviders(<NavigationHarness />)

    await userEvent.hover(screen.getByLabelText("hover target"))

    expect(gsapState.state.to).toStrictEqual([])
  })

  it("cross-fades from the previously active menu image to the hovered one", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "show second image" }))

    expect(gsapState.state.to.at(-1)?.[0]).toBe('[data-menu-image="0"]')
    expect(gsapState.state.fromTo.at(-1)?.[0]).toBe('[data-menu-image="2"]')
  })

  it("ignores a repeat hover on the image that is already showing", async () => {
    renderWithProviders(<NavigationHarness />)
    const trigger = screen.getByRole("button", { name: "show second image" })

    await userEvent.click(trigger)
    gsapState.state.to = []
    gsapState.state.fromTo = []
    await userEvent.click(trigger)

    expect(gsapState.state.to).toStrictEqual([])
    expect(gsapState.state.fromTo).toStrictEqual([])
  })
})

describe("navigation parallax", () => {
  it("ignores SVG surfaces that do not provide an HTML layout box", () => {
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(screen.getByLabelText("vector surface"), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([])
    expect(gsapState.state.to).toStrictEqual([])
  })

  it("uses desktop motion defaults if the animation context has no media conditions", () => {
    gsapState.state.conditions = undefined
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([
      ["x", CONSTANTS.PARALLAX_OFFSET],
      ["y", -CONSTANTS.PARALLAX_OFFSET],
    ])
  })

  it("offsets the showcase from the pointer position relative to the surface centre", () => {
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([
      ["x", CONSTANTS.PARALLAX_OFFSET],
      ["y", -CONSTANTS.PARALLAX_OFFSET],
    ])
  })

  it("leaves the showcase centred when the pointer sits at the middle", () => {
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 100, clientY: 50 })

    expect(gsapState.state.parallax).toStrictEqual([
      ["x", 0],
      ["y", 0],
    ])
  })

  it("rotates the showcase against the pointer", () => {
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.to.at(-1)?.[1]).toMatchObject({
      rotationX: CONSTANTS.ROTATION_MULTIPLIER,
      rotationY: CONSTANTS.ROTATION_MULTIPLIER,
    })
  })

  it("skips the parallax entirely on a mobile viewport", () => {
    gsapState.state.conditions = { desktop: false, reduced: false }
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([])
  })

  it("skips the parallax for a visitor who prefers reduced motion", () => {
    gsapState.state.conditions = { desktop: true, reduced: true }
    renderWithProviders(<NavigationHarness />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([])
  })
})

describe("navigation scroll state", () => {
  it("marks the header scrolled when the page leaves the top", () => {
    renderWithProviders(<NavigationHarness />)

    act(() => {
      gsapState.state.onScrollToggle?.({ isActive: true })
    })

    expect(harnessState()).toContain("scrolled:true")
  })

  it("clears the scrolled header once the page returns to the top", () => {
    gsapState.state.scrollActive = true
    renderWithProviders(<NavigationHarness />)

    act(() => {
      gsapState.state.onScrollToggle?.({ isActive: false })
    })

    expect(harnessState()).toContain("scrolled:false")
  })
})

describe("navigation scroll lock", () => {
  it("reserves the scrollbar width so the page does not jump when the menu opens", async () => {
    const restore = withScrollbar(15)
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))

    expect(gsapState.state.sets).toContainEqual(["html", { overflow: "hidden" }])
    expect(gsapState.state.sets).toContainEqual(["body", { paddingRight: 15 }])
    restore()
  })

  it("reserves nothing when the viewport has no scrollbar", async () => {
    const restore = withScrollbar(0)
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))

    expect(gsapState.state.sets).toContainEqual(["body", { overflow: "hidden" }])
    expect(gsapState.state.sets.some(([target, vars]) => target === "body" && JSON.stringify(vars).includes("paddingRight"))).toBe(false)
    restore()
  })
})

describe("navigation menu animation", () => {
  it("reveals the panel as the opening animation starts", async () => {
    renderWithProviders(<NavigationHarness />)
    const panel = document.querySelector("dialog")

    act(() => {
      gsapState.state.panelOnStart?.()
    })

    expect(gsapState.state.sets).toContainEqual([panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_VISIBLE }])
    await Promise.resolve()
  })

  it("rewinds the open panel instead of cutting it when the menu closes", async () => {
    renderWithProviders(<NavigationHarness />)
    await userEvent.click(screen.getByRole("button", { name: "open menu" }))
    gsapState.state.progress = 0.5
    gsapState.state.timelineActions = []

    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    expect(gsapState.state.timelineActions).toContain("reverse")
  })

  it("leaves the timeline alone when the menu closes before it ever opened", () => {
    renderWithProviders(<NavigationHarness />)
    gsapState.state.timelineActions = []

    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    expect(gsapState.state.timelineActions).toStrictEqual([])
  })

  it("unmounts the panel and scrolls to the queued section once the rewind finishes", () => {
    const onNavigate = vi.fn<(opts: { hash?: string; to?: string }) => void>()
    renderWithProviders(<NavigationHarness onNavigate={onNavigate} />)
    act(() => {
      useNavigationStore.getState().setMenuOpen(true)
      useNavigationStore.getState().setPendingHash("philosophy")
    })
    gsapState.state.progress = 0.5
    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    act(() => {
      gsapState.state.onReverseComplete?.()
    })

    expect(harnessState()).toContain("mounted:false")
    expect(onNavigate).toHaveBeenCalledWith({ hash: "philosophy", to: "/" })
    expect(useNavigationStore.getState().pendingHash).toBeUndefined()
  })

  it("navigates nowhere when the rewind finishes with no queued section", () => {
    const onNavigate = vi.fn<(opts: { hash?: string; to?: string }) => void>()
    renderWithProviders(<NavigationHarness onNavigate={onNavigate} />)
    act(() => {
      useNavigationStore.getState().setMenuOpen(true)
    })
    gsapState.state.progress = 0.5
    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    act(() => {
      gsapState.state.onReverseComplete?.()
    })

    expect(harnessState()).toContain("mounted:false")
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("hides the backdrop when a route navigation dismisses the menu", async () => {
    renderWithProviders(<NavigationHarness />)
    await userEvent.click(screen.getByRole("button", { name: "open menu" }))

    await userEvent.click(screen.getByRole("button", { name: "dismiss menu" }))

    expect(gsapState.state.sets).toContainEqual([screen.getByTestId("backdrop"), { autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN }])
  })
})

describe("navigation showcase without an image container", () => {
  it("keeps the parallax idle when the menu renders no showcase", () => {
    renderWithProviders(<NavigationHarness withImageContainer={false} />)

    fireEvent.mouseMove(sizedSurface(), { clientX: 200, clientY: 0 })

    expect(gsapState.state.parallax).toStrictEqual([])
    expect(gsapState.state.to).toStrictEqual([])
  })
})

describe("navigation hover under reduced motion", () => {
  it("does not animate the element back to rest on leave", async () => {
    gsapState.state.conditions = { desktop: true, reduced: true }
    renderWithProviders(<NavigationHarness />)
    const target = screen.getByLabelText("hover target")

    await userEvent.hover(target)
    await userEvent.unhover(target)

    expect(gsapState.state.to).toStrictEqual([])
  })
})
