import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const motion = vi.hoisted(() => ({ reduced: false }))

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: motion.reduced && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

type VisibilityCallback = (entries: readonly { readonly isIntersecting: boolean }[]) => void

const viewport = vi.hoisted(() => ({
  observers: [] as {
    callback: VisibilityCallback
    disconnected: boolean
    options: IntersectionObserverInit | undefined
    targets: Element[]
  }[],
}))

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { VideoExperienceSection } from "~/src/presentation/components/custom/pages/landing-page/sections/video-experience-section"

class RecordingIntersectionObserver {
  private readonly record: (typeof viewport.observers)[number]

  constructor(callback: VisibilityCallback, options?: IntersectionObserverInit) {
    this.record = { callback, disconnected: false, options, targets: [] }
    viewport.observers.push(this.record)
  }

  observe(target: Element): void {
    this.record.targets.push(target)
  }

  disconnect(): void {
    this.record.disconnected = true
  }
}

const media = {
  pause: vi.fn<() => void>(),
  play: vi.fn<() => Promise<void>>(),
}

const ambienceVideo = (): HTMLVideoElement => {
  const video = screen.getByLabelText("M'Arte atelier ambience video")
  if (!(video instanceof HTMLVideoElement)) {
    throw new Error("expected the ambience video element")
  }

  return video
}

const poster = (container: HTMLElement): HTMLImageElement => {
  const image = container.querySelector("img")
  if (image === null) {
    throw new Error("expected the video poster image")
  }

  return image
}

const scrollVideo = (isIntersecting: boolean): void => {
  for (const { callback, targets } of viewport.observers) {
    callback(targets.map(() => ({ isIntersecting })))
  }
}

beforeEach(() => {
  motion.reduced = false
  viewport.observers.length = 0
  media.play.mockReset().mockResolvedValue()
  media.pause.mockReset()
  vi.stubGlobal("IntersectionObserver", RecordingIntersectionObserver)
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(media.play)
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(media.pause)
})

describe("VideoExperienceSection", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders the two heading lines", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("We co-createwhat is unique.")
  })

  it("renders the eyebrow and the description", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByText("Handcrafted")).toBeInTheDocument()
    expect(screen.getByText(/Some stories deserve their own shape/u)).toBeInTheDocument()
  })

  it("downloads the ambience video with the page but plays nothing until it is on screen", () => {
    renderWithProviders(<VideoExperienceSection />)

    const video = ambienceVideo()

    expect(video).toHaveAttribute("preload", "auto")
    expect(video).not.toHaveAttribute("autoplay")
    expect(video).not.toHaveAttribute("poster")
    expect(media.play).not.toHaveBeenCalled()
  })

  it("keeps the video muted, looping, inline and at its 1920 by 1080 frame size", () => {
    renderWithProviders(<VideoExperienceSection />)

    const video = ambienceVideo()

    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute("loop")
    expect(video).toHaveAttribute("playsinline")
    expect(video).toHaveAttribute("width", "1920")
    expect(video).toHaveAttribute("height", "1080")
  })

  it("covers the video with a lazily loaded marketing still of the same frame size until it plays", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)

    const image = poster(container)

    expect(image.getAttribute("src")).toContain("marketing/editorial.webp")
    expect(image).toHaveAttribute("alt", "")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
    expect(image).not.toHaveAttribute("fetchpriority")
    expect(image.style.maxWidth).toBe("1920px")
    expect(image.style.maxHeight).toBe("1080px")
    expect(image).not.toHaveClass("invisible")
  })

  it("starts the video once a quarter of it is on screen and pauses it when it leaves", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(viewport.observers).toHaveLength(1)
    expect(viewport.observers[0]?.options).toStrictEqual({ threshold: 0.25 })
    expect(viewport.observers[0]?.targets).toStrictEqual([ambienceVideo()])

    scrollVideo(true)

    expect(media.play).toHaveBeenCalledOnce()
    expect(media.pause).not.toHaveBeenCalled()

    scrollVideo(false)

    expect(media.pause).toHaveBeenCalledOnce()
  })

  it("leaves the still in place when the browser refuses to play the video", async () => {
    media.play.mockRejectedValue(new DOMException("blocked", "NotAllowedError"))
    const { container } = renderWithProviders(<VideoExperienceSection />)

    scrollVideo(true)
    await Promise.resolve()

    expect(media.play).toHaveBeenCalledOnce()
    expect(poster(container)).not.toHaveClass("invisible")
  })

  it("hides the still once the video is playing and brings it back if the video fails", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)

    fireEvent.playing(ambienceVideo())

    expect(poster(container)).toHaveClass("invisible")

    fireEvent.error(ambienceVideo())

    expect(poster(container)).not.toHaveClass("invisible")
  })

  it("stops watching the video when the section unmounts", () => {
    const { unmount } = renderWithProviders(<VideoExperienceSection />)

    unmount()

    expect(viewport.observers[0]?.disconnected).toBe(true)
  })

  it("never plays the video for visitors who prefer reduced motion and shows them the still", () => {
    motion.reduced = true
    const { container, unmount } = renderWithProviders(<VideoExperienceSection />)

    scrollVideo(true)

    expect(viewport.observers).toHaveLength(0)
    expect(media.play).not.toHaveBeenCalled()
    expect(poster(container)).not.toHaveClass("invisible")

    unmount()

    expect(media.play).not.toHaveBeenCalled()
  })

  it("links the two calls to action to collections and products", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByRole("link", { name: "View collections" })).toHaveAttribute("href", "/collections")
    expect(screen.getByRole("link", { name: "Explore all products" })).toHaveAttribute("href", "/products")
  })

  it("anchors the section for the experience navigation link", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)

    expect(container.querySelector("section")).toHaveAttribute("id", "experience")
  })

  it("centres the copy between equal phone and tablet gutters and keeps the desktop column at the left edge", () => {
    renderWithProviders(<VideoExperienceSection />)

    const content = screen.getByRole("heading", { level: 2 }).parentElement?.parentElement

    expect(content).toHaveClass("storefront-container", "lg:ml-0")
  })
})
