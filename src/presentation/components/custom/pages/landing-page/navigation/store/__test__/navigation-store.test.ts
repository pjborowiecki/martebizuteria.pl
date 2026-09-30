import { beforeEach, describe, expect, it } from "vite-plus/test"

import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

const initialState = useNavigationStore.getState()

describe("useNavigationStore", () => {
  beforeEach(() => {
    useNavigationStore.setState(initialState, true)
  })

  it("starts with every panel closed, unscrolled and with no pending hash", () => {
    const state = useNavigationStore.getState()

    expect(state.menuOpen).toBe(false)
    expect(state.searchOpen).toBe(false)
    expect(state.scrolled).toBe(false)
    expect(state.pendingHash).toBeUndefined()
  })

  it("opens and closes the mobile menu without touching the search panel", () => {
    useNavigationStore.getState().setMenuOpen(true)

    expect(useNavigationStore.getState().menuOpen).toBe(true)
    expect(useNavigationStore.getState().searchOpen).toBe(false)

    useNavigationStore.getState().setMenuOpen(false)

    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })

  it("opens the search panel independently of the menu", () => {
    useNavigationStore.getState().setMenuOpen(true)
    useNavigationStore.getState().setSearchOpen(true)

    expect(useNavigationStore.getState().menuOpen).toBe(true)
    expect(useNavigationStore.getState().searchOpen).toBe(true)
  })

  it("records the scrolled state the header listens to", () => {
    useNavigationStore.getState().setScrolled(true)

    expect(useNavigationStore.getState().scrolled).toBe(true)
  })

  it("remembers a hash to scroll to and lets it be cleared again", () => {
    useNavigationStore.getState().setPendingHash("#kontakt")

    expect(useNavigationStore.getState().pendingHash).toBe("#kontakt")

    useNavigationStore.getState().setPendingHash(undefined)

    expect(useNavigationStore.getState().pendingHash).toBeUndefined()
  })

  it("notifies subscribers only once per change", () => {
    let notifications = 0
    const unsubscribe = useNavigationStore.subscribe(() => {
      notifications += 1
    })

    useNavigationStore.getState().setMenuOpen(true)
    useNavigationStore.getState().setSearchOpen(true)
    unsubscribe()
    useNavigationStore.getState().setScrolled(true)

    expect(notifications).toBe(2)
  })
})
