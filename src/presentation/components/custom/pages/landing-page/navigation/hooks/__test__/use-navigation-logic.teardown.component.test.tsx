import { type JSX, useRef } from "react"

import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

const gsapState = vi.hoisted(() => {
  const state: {
    killed: number
    mediaCleanup: (() => void) | undefined
    onMediaChange: (() => (() => void) | undefined) | undefined
    onReverseComplete: (() => void) | undefined
    progress: number
    reverted: number
    scrolledSectionId: string | undefined
    timelineActions: string[]
  } = {
    killed: 0,
    mediaCleanup: undefined,
    onMediaChange: undefined,
    onReverseComplete: undefined,
    progress: 0,
    reverted: 0,
    scrolledSectionId: undefined,
    timelineActions: [],
  }

  return { state }
})

const lenisState = vi.hoisted(() => ({ sectionOnPage: false }))

vi.mock("~/src/integrations/lenis/lenis.scroll", () => ({
  scrollToSectionById: (id: string): HTMLElement | undefined => {
    if (!lenisState.sectionOnPage) {
      return undefined
    }
    gsapState.state.scrolledSectionId = id

    return document.createElement("section")
  },
}))
vi.mock("~/src/integrations/gsap/gsap.config", async () => {
  const { useEffect, useRef: useStored } = await import("react")

  const timeline = {
    fromTo: () => timeline,
    kill: () => {
      gsapState.state.killed += 1
    },
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
    ScrollTrigger: { create: () => ({ isActive: false }) },
    gsap: {
      fromTo: () => {},
      matchMedia: () => ({
        add: (_media: unknown, run: (context: { conditions: { desktop: boolean; reduced: boolean } }) => (() => void) | undefined) => {
          gsapState.state.onMediaChange = () => run({ conditions: { desktop: true, reduced: false } })
          gsapState.state.mediaCleanup = gsapState.state.onMediaChange()
        },
        revert: () => {
          gsapState.state.reverted += 1
          gsapState.state.mediaCleanup?.()
          gsapState.state.mediaCleanup = undefined
        },
      }),
      quickTo: () => () => {},
      set: () => {},
      timeline: (config: { onReverseComplete?: () => void }) => {
        gsapState.state.onReverseComplete = config.onReverseComplete

        return timeline
      },
      to: () => {},
    },
    useGSAP: (callback: () => (() => void) | undefined, config?: { dependencies?: readonly unknown[] }) => {
      const lastDependencies = useStored<readonly unknown[] | undefined>(undefined)
      const teardown = useStored<(() => void) | undefined>(undefined)
      useEffect(() => {
        const dependencies = config?.dependencies ?? []
        const previous = lastDependencies.current
        if (
          previous !== undefined &&
          previous.length === dependencies.length &&
          previous.every((entry, index) => entry === dependencies[index])
        ) {
          return
        }
        lastDependencies.current = dependencies
        teardown.current?.()
        teardown.current = callback()
      })
      useEffect(
        () => () => {
          teardown.current?.()
          teardown.current = undefined
        },
        [],
      )

      return { contextSafe: <TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn) => fn }
    },
  }
})

const { useNavigationLogic } = await import("~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-navigation-logic")

const { useNavigationStore } = await import("~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store")

const noop = () => {}

const NavigationHarness = ({
  onNavigate = noop,
  withMarkup = true,
}: Readonly<{
  onNavigate?: (opts: { hash?: string; to?: string }) => void
  withMarkup?: boolean
}>): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  const { menuOpen, mounted } = useNavigationLogic(containerRef, panelRef, onNavigate)

  return (
    <div ref={withMarkup ? containerRef : undefined}>
      {withMarkup ? <dialog ref={panelRef} /> : undefined}
      <p>{`mounted:${String(mounted)} open:${String(menuOpen)}`}</p>
    </div>
  )
}

const harnessState = (): string | null => screen.getByText(/^mounted:/u).textContent

const openMenu = () => {
  act(() => {
    useNavigationStore.getState().setMenuOpen(true)
  })
}

beforeEach(() => {
  gsapState.state.killed = 0
  gsapState.state.mediaCleanup = undefined
  gsapState.state.onMediaChange = undefined
  gsapState.state.onReverseComplete = undefined
  gsapState.state.progress = 0
  gsapState.state.reverted = 0
  gsapState.state.scrolledSectionId = undefined
  gsapState.state.timelineActions = []
  lenisState.sectionOnPage = false
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
})

afterEach(() => {
  cleanup()
})

describe("navigation teardown", () => {
  it("reverts the media query and kills the timeline when the navigation leaves the page", () => {
    const { unmount } = renderWithProviders(<NavigationHarness />)

    unmount()

    expect(gsapState.state.reverted).toBe(1)
    expect(gsapState.state.killed).toBe(1)
  })

  it("stops listening for escape once the navigation leaves the page", () => {
    const { unmount } = renderWithProviders(<NavigationHarness />)
    openMenu()

    unmount()
    fireEvent.keyDown(document, { key: "Escape" })

    expect(useNavigationStore.getState().menuOpen).toBe(true)
  })

  it("dismisses the open menu and clears a queued section when another route loads", async () => {
    const { router } = renderWithProviders(<NavigationHarness />)
    openMenu()
    act(() => {
      useNavigationStore.getState().setPendingHash("philosophy")
    })

    await act(async () => {
      await router.navigate({ to: "/about" })
    })

    expect(harnessState()).toBe("mounted:false open:false")
    expect(useNavigationStore.getState().pendingHash).toBeUndefined()
    expect(gsapState.state.timelineActions).toContain("pause")
  })
})

describe("navigation without its menu markup", () => {
  it("builds no timeline, so opening the menu mounts no panel", () => {
    renderWithProviders(<NavigationHarness withMarkup={false} />)

    openMenu()

    expect(harnessState()).toBe("mounted:false open:true")
    expect(gsapState.state.timelineActions).toStrictEqual([])
    expect(gsapState.state.onReverseComplete).toBeUndefined()
  })

  it("can dismiss menu state after navigation even when no panel was mounted", async () => {
    const { router } = renderWithProviders(<NavigationHarness withMarkup={false} />)
    openMenu()

    await act(async () => {
      await router.navigate({ to: "/about" })
    })

    expect(harnessState()).toBe("mounted:false open:false")
    expect(gsapState.state.timelineActions).toStrictEqual([])
  })

  it("does not rebuild animations when a media change follows removal of the panel", () => {
    const { queryClient, rerender, router } = renderWithProviders(<NavigationHarness />)
    const previousReverseComplete = gsapState.state.onReverseComplete

    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        <NavigationHarness withMarkup={false} />
      </TestProviders>,
    )
    let mediaCleanup: (() => void) | undefined = globalThis.undefined
    act(() => {
      mediaCleanup = gsapState.state.onMediaChange?.()
    })

    expect(mediaCleanup).toBeUndefined()
    expect(gsapState.state.onReverseComplete).toBe(previousReverseComplete)
    expect(document.querySelector("dialog")).toBeNull()
  })
})

describe("navigation queued section already on the page", () => {
  it("scrolls to the section instead of routing to the home page", () => {
    lenisState.sectionOnPage = true
    const onNavigate = vi.fn<(opts: { hash?: string; to?: string }) => void>()
    renderWithProviders(<NavigationHarness onNavigate={onNavigate} />)
    openMenu()
    act(() => {
      useNavigationStore.getState().setPendingHash("philosophy")
    })
    gsapState.state.progress = 0.5
    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    act(() => {
      gsapState.state.onReverseComplete?.()
    })

    expect(gsapState.state.scrolledSectionId).toBe("philosophy")
    expect(onNavigate).not.toHaveBeenCalled()
    expect(useNavigationStore.getState().pendingHash).toBeUndefined()
  })

  it("routes to the home page when the section is nowhere on this page", async () => {
    const onNavigate = vi.fn<(opts: { hash?: string; to?: string }) => void>()
    renderWithProviders(<NavigationHarness onNavigate={onNavigate} />)
    openMenu()
    act(() => {
      useNavigationStore.getState().setPendingHash("philosophy")
    })
    gsapState.state.progress = 0.5
    act(() => {
      useNavigationStore.getState().setMenuOpen(false)
    })

    act(() => {
      gsapState.state.onReverseComplete?.()
    })
    await userEvent.tab()

    expect(onNavigate).toHaveBeenCalledWith({ hash: "philosophy", to: "/" })
  })
})
