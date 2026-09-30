import { type JSX, useRef } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mediaState = vi.hoisted(() => {
  const state = { prefersReducedMotion: false }
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      get matches() {
        return query.includes("reduce") ? state.prefersReducedMotion : !state.prefersReducedMotion
      },
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })

  return state
})

import { gsap } from "~/src/integrations/gsap/gsap.config"

import { useProductCardImageHover } from "~/src/hooks/use-product-card-image-hover"

const HoverHarness = (): JSX.Element => {
  const imageLayerRef = useRef<HTMLDivElement>(null)
  const { handleMouseEnter, handleMouseLeave } = useProductCardImageHover(imageLayerRef)

  return <div data-testid="layer" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={imageLayerRef} />
}

const stubReducedMotion = (prefersReducedMotion: boolean): void => {
  mediaState.prefersReducedMotion = prefersReducedMotion
}

const layer = (): HTMLElement => screen.getByTestId("layer")

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("useProductCardImageHover when motion is welcome", () => {
  beforeEach(() => {
    stubReducedMotion(false)
  })

  it("zooms the image layer in on hover", () => {
    const to = vi.spyOn(gsap, "to")
    render(<HoverHarness />)

    fireEvent.mouseEnter(layer())

    expect(to).toHaveBeenCalledTimes(1)
    expect(to.mock.calls[0]?.[1]).toMatchObject({ overwrite: "auto", scale: 1.03 })
  })

  it("zooms back out when the pointer leaves", () => {
    const to = vi.spyOn(gsap, "to")
    render(<HoverHarness />)

    fireEvent.mouseLeave(layer())

    expect(to.mock.calls[0]?.[1]).toMatchObject({ scale: 1 })
  })

  it("eases out more slowly than it eases in, so the card settles gently", () => {
    const to = vi.spyOn(gsap, "to")
    render(<HoverHarness />)

    fireEvent.mouseEnter(layer())
    fireEvent.mouseLeave(layer())

    expect(to.mock.calls[0]?.[1]).toMatchObject({ duration: 0.55 })
    expect(to.mock.calls[1]?.[1]).toMatchObject({ duration: 0.7 })
  })

  it("animates the layer itself rather than the card", () => {
    const to = vi.spyOn(gsap, "to")
    render(<HoverHarness />)

    fireEvent.mouseEnter(layer())

    expect(to.mock.calls[0]?.[0]).toBe(layer())
  })
})

describe("useProductCardImageHover when the visitor asked for less motion", () => {
  beforeEach(() => {
    stubReducedMotion(true)
  })

  it("does not zoom in on hover", () => {
    const to = vi.spyOn(gsap, "to")
    render(<HoverHarness />)

    fireEvent.mouseEnter(layer())

    expect(to).not.toHaveBeenCalled()
  })

  it("snaps the layer back to its resting scale instead of tweening out", () => {
    const to = vi.spyOn(gsap, "to")
    const set = vi.spyOn(gsap, "set")
    render(<HoverHarness />)
    set.mockClear()

    fireEvent.mouseLeave(layer())

    expect(to).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledTimes(1)
    expect(set.mock.calls[0]?.[0]).toBe(layer())
    expect(set.mock.calls[0]?.[1]).toMatchObject({ scale: 1 })
  })
})

const DetachedHarness = (): JSX.Element => {
  const imageLayerRef = useRef<HTMLDivElement>(null)
  const { handleMouseEnter, handleMouseLeave } = useProductCardImageHover(imageLayerRef)

  return <button data-testid="detached" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} type="button" />
}

const detached = (): HTMLElement => screen.getByTestId("detached")

describe("useProductCardImageHover before the image layer is mounted", () => {
  beforeEach(() => {
    stubReducedMotion(false)
  })

  it("sets nothing up while there is no layer to animate", () => {
    const set = vi.spyOn(gsap, "set")
    render(<DetachedHarness />)

    expect(set).not.toHaveBeenCalled()
  })

  it("does nothing on hover", () => {
    const to = vi.spyOn(gsap, "to")
    render(<DetachedHarness />)

    fireEvent.mouseEnter(detached())

    expect(to).not.toHaveBeenCalled()
  })

  it("does nothing when the pointer leaves", () => {
    const to = vi.spyOn(gsap, "to")
    const set = vi.spyOn(gsap, "set")
    render(<DetachedHarness />)

    fireEvent.mouseLeave(detached())

    expect(to).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
})
