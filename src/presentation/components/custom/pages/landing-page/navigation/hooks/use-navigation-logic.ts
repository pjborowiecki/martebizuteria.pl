import { type MouseEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react"

import { useRouterState } from "@tanstack/react-router"
import { useShallow } from "zustand/react/shallow"

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap"
import { scrollToSectionById } from "~/src/lib/lenis/scroll-to-section"

import * as CONSTANTS from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"
const useNavigationHoverLogic = ({
  activeImageIndex,
  contextSafe,
  isDesktop,
  isReducedMotion,
  parallax,
  parallaxTargetRef,
}: {
  activeImageIndex: RefObject<number>
  contextSafe: <Args extends unknown[], Ret>(func: (...args: Args) => Ret) => (...args: Args) => Ret
  isDesktop: RefObject<boolean>
  isReducedMotion: RefObject<boolean>
  parallax: RefObject<ParallaxQuickTo | undefined>
  parallaxTargetRef: RefObject<Element | undefined>
}) => {
  const handleHover = contextSafe((index: number) => {
    if (activeImageIndex.current === index) {
      return
    }
    gsap.to(`[data-menu-image="${activeImageIndex.current}"]`, {
      autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN,
      duration: CONSTANTS.DUR_FOOTER,
      ease: "power2.out",
      overwrite: "auto",
      scale: CONSTANTS.INACTIVE_SCALE,
    })
    gsap.fromTo(
      `[data-menu-image="${index}"]`,
      { scale: CONSTANTS.INACTIVE_SCALE },
      {
        autoAlpha: CONSTANTS.AUTO_ALPHA_VISIBLE,
        duration: CONSTANTS.DUR_BASE,
        ease: "power3.out",
        overwrite: "auto",
        scale: CONSTANTS.ACTIVE_SCALE,
      },
    )
    activeImageIndex.current = index
  })
  const handleMouseMove = contextSafe((event: MouseEvent) => {
    if (isReducedMotion.current || !isDesktop.current) {
      return
    }
    const el = event.currentTarget
    if (!(el instanceof HTMLElement)) {
      return
    }
    const xPos = (event.clientX / el.clientWidth - CONSTANTS.MOUSE_CENTER_OFFSET) * CONSTANTS.MOUSE_MULTIPLIER
    const yPos = (event.clientY / el.clientHeight - CONSTANTS.MOUSE_CENTER_OFFSET) * CONSTANTS.MOUSE_MULTIPLIER
    parallax.current?.x(xPos * CONSTANTS.PARALLAX_OFFSET)
    parallax.current?.y(yPos * CONSTANTS.PARALLAX_OFFSET)
    const target = parallaxTargetRef.current
    if (target !== undefined) {
      gsap.to(target, {
        duration: 1.5,
        ease: "power3.out",
        overwrite: "auto",
        rotationX: -yPos * CONSTANTS.ROTATION_MULTIPLIER,
        rotationY: xPos * CONSTANTS.ROTATION_MULTIPLIER,
      })
    }
  })
  const getHoverProps = useCallback(
    (options?: HoverOptions): HoverHandlers => {
      const {
        y: hoverOffsetY = CONSTANTS.HOVER_Y_OFFSET,
        scale = CONSTANTS.HOVER_SCALE,
        enterDuration = CONSTANTS.HOVER_ENTER_DURATION,
        leaveDuration = CONSTANTS.HOVER_LEAVE_DURATION,
      } = options ?? {}
      let element: HTMLElement | undefined = globalThis.undefined
      return {
        onMouseEnter: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return
          }
          gsap.to(element, {
            duration: enterDuration,
            ease: "power2.out",
            overwrite: "auto",
            scale,
            y: hoverOffsetY,
          })
        }),
        onMouseLeave: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return
          }
          gsap.to(element, {
            duration: leaveDuration,
            ease: "power3.inOut",
            overwrite: "auto",
            scale: CONSTANTS.ACTIVE_SCALE,
            y: CONSTANTS.POS_IMMEDIATE,
          })
        }),
        ref: (el: HTMLElement | null) => {
          element = el ?? undefined
        },
      }
    },
    [contextSafe, isReducedMotion],
  )
  return {
    getHoverProps,
    handleHover,
    handleMouseMove,
  }
}
const createMenuTimeline = ({
  dur,
  ease,
  onReverseComplete,
  panel,
  pos,
}: {
  dur: (full: number) => number
  ease: (full: string) => string
  onReverseComplete: () => void
  panel: HTMLDialogElement
  pos: (full: number) => number
}) => {
  const tl = gsap.timeline({
    defaults: { duration: dur(CONSTANTS.DUR_BASE), ease: "expo.out" },
    onReverseComplete,
    paused: true,
  })
  tl.fromTo(
    panel,
    { clipPath: CONSTANTS.CLIP_CLOSED },
    {
      clipPath: CONSTANTS.CLIP_OPEN,
      duration: dur(CONSTANTS.DUR_PANEL),
      ease: ease("power3.inOut"),
      force3D: true,
      onStart: () => {
        gsap.set(panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_VISIBLE })
      },
    },
  )
    .fromTo(
      "[data-menu-backdrop]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN },
      { duration: dur(CONSTANTS.DUR_BACKDROP), opacity: CONSTANTS.AUTO_ALPHA_VISIBLE },
      CONSTANTS.POS_IMMEDIATE,
    )
    .fromTo(
      "[data-menu-header]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: -28 },
      { duration: dur(CONSTANTS.DUR_HEADER), ease: ease("power3.out"), opacity: CONSTANTS.AUTO_ALPHA_VISIBLE, y: CONSTANTS.POS_IMMEDIATE },
      pos(CONSTANTS.POS_HEADER),
    )
    .fromTo(
      "[data-menu-link]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, rotateZ: 2, y: 56 },
      {
        clearProps: "transform",
        duration: dur(CONSTANTS.DUR_LINK),
        ease: ease("power3.out"),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        rotateZ: CONSTANTS.POS_IMMEDIATE,
        stagger: pos(CONSTANTS.STAGGER_LINK),
        y: CONSTANTS.POS_IMMEDIATE,
      },
      pos(CONSTANTS.POS_LINK),
    )
    .fromTo(
      "[data-menu-secondary]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: 24 },
      {
        duration: dur(CONSTANTS.DUR_BACKDROP),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        stagger: pos(CONSTANTS.STAGGER_SECONDARY),
        y: CONSTANTS.POS_IMMEDIATE,
      },
      pos(CONSTANTS.POS_SECONDARY),
    )
    .fromTo(
      "[data-menu-image-container]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, scale: CONSTANTS.HOVER_SCALE },
      {
        duration: dur(CONSTANTS.DUR_IMAGE),
        ease: ease("power2.out"),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        scale: CONSTANTS.ACTIVE_SCALE,
      },
      pos(CONSTANTS.POS_IMAGE),
    )
    .fromTo(
      "[data-menu-footer]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: 16 },
      { duration: dur(CONSTANTS.DUR_FOOTER), opacity: CONSTANTS.AUTO_ALPHA_VISIBLE, y: CONSTANTS.POS_IMMEDIATE },
      pos(CONSTANTS.POS_FOOTER),
    )
  return tl
}
const clearNavigationMenuScrollLock = (): void => {
  gsap.set("html", { clearProps: "overflow" })
  gsap.set("body", { clearProps: "overflow,paddingRight" })
}
const forceDismissNavigationMenu = ({
  containerRef,
  panelRef,
  setMounted,
  tlRef,
}: Readonly<{
  containerRef: RefObject<HTMLDivElement | null>
  panelRef: RefObject<HTMLDialogElement | null>
  setMounted: (val: boolean) => void
  tlRef: RefObject<gsap.core.Timeline | undefined>
}>): void => {
  const panel = panelRef.current
  const backdrop = containerRef.current?.querySelector("[data-menu-backdrop]")
  setMounted(false)
  clearNavigationMenuScrollLock()
  const tl = tlRef.current
  if (tl !== undefined) {
    tl.pause()
    tl.progress(CONSTANTS.POS_IMMEDIATE)
  }
  if (panel !== null) {
    gsap.set(panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN, clipPath: CONSTANTS.CLIP_CLOSED, visibility: "hidden" })
  }
  if (backdrop instanceof HTMLElement) {
    gsap.set(backdrop, { autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN })
  }
}
const scrollToSection = (id: string, navigate: (opts: { hash?: string; to?: string }) => void | Promise<void>) => {
  if (scrollToSectionById(id, CONSTANTS.HEADER_OFFSET_PX) !== undefined) {
    return
  }
  void navigate({ hash: id, to: "/{-$locale}" })
}
const useNavigationStateEffects = ({
  menuOpen,
  setMenuOpen,
  setScrolled,
}: {
  menuOpen: boolean
  setMenuOpen: (val: boolean) => void
  setScrolled: (val: boolean) => void
}) => {
  useGSAP(() => {
    const trigger = ScrollTrigger.create({
      end: "max",
      onToggle: ({ isActive }) => {
        setScrolled(isActive)
      },
      start: "top -20px",
    })
    setScrolled(trigger.isActive)
  })
  useGSAP(
    () => {
      if (!menuOpen) {
        return
      }
      const scrollbarWidth = document.documentElement.offsetWidth - document.documentElement.clientWidth
      gsap.set("html", { overflow: "hidden" })
      gsap.set("body", { overflow: "hidden" })
      if (scrollbarWidth > CONSTANTS.POS_IMMEDIATE) {
        gsap.set("body", { paddingRight: scrollbarWidth })
      }
    },
    { dependencies: [menuOpen], revertOnUpdate: true },
  )
  useGSAP(
    () => {
      if (!menuOpen) {
        return
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setMenuOpen(false)
        }
      }
      document.addEventListener("keydown", onKeyDown)
      return () => {
        document.removeEventListener("keydown", onKeyDown)
      }
    },
    { dependencies: [menuOpen, setMenuOpen], revertOnUpdate: true },
  )
}
const useNavigationEffects = ({
  containerRef,
  isDesktop,
  isReducedMotion,
  menuOpen,
  panelRef,
  parallax,
  parallaxTargetRef,
  routerNavigate,
  setMounted,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  isDesktop: RefObject<boolean>
  isReducedMotion: RefObject<boolean>
  menuOpen: boolean
  panelRef: RefObject<HTMLDialogElement | null>
  parallax: RefObject<ParallaxQuickTo | undefined>
  parallaxTargetRef: RefObject<Element | undefined>
  routerNavigate: (opts: { hash?: string; to?: string }) => void | Promise<void>
  setMounted: (val: boolean) => void
}) => {
  const tlRef = useRef<gsap.core.Timeline | undefined>(globalThis.undefined)
  const { contextSafe } = useGSAP(
    () => {
      if (!containerRef.current || !panelRef.current) {
        return
      }
      const imgContainer = containerRef.current.querySelector("[data-menu-image-container]")
      parallaxTargetRef.current = imgContainer ?? undefined
      if (imgContainer) {
        const opts = { duration: 1.5, ease: "power3.out" } as const
        parallax.current = { x: gsap.quickTo(imgContainer, "x", opts), y: gsap.quickTo(imgContainer, "y", opts) }
      } else {
        parallax.current = globalThis.undefined
      }
      const mm = gsap.matchMedia()
      mm.add(
        CONSTANTS.MENU_MEDIA,
        (context) => {
          const { reduced = false, desktop = true } = context.conditions ?? {}
          isReducedMotion.current = reduced
          isDesktop.current = desktop
          const dur = (full: number) => (reduced ? CONSTANTS.DUR_QUICK : full)
          const pos = (full: number) => (reduced ? CONSTANTS.POS_IMMEDIATE : full)
          const ease = (full: string) => (reduced ? "none" : full)
          const panel = panelRef.current
          if (!panel) {
            return
          }
          gsap.set(panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN, clipPath: CONSTANTS.CLIP_CLOSED, force3D: true })
          const tl = createMenuTimeline({
            dur,
            ease,
            onReverseComplete: () => {
              gsap.set(panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN, clipPath: CONSTANTS.CLIP_CLOSED })
              setMounted(false)
              const { pendingHash, setPendingHash } = useNavigationStore.getState()
              if (pendingHash !== undefined) {
                scrollToSection(pendingHash, routerNavigate)
                setPendingHash(undefined)
              }
            },
            panel,
            pos,
          })
          tlRef.current = tl
          return () => {
            tl.kill()
            tlRef.current = undefined
          }
        },
        containerRef,
      )
      return () => {
        mm.revert()
        parallax.current = globalThis.undefined
        parallaxTargetRef.current = globalThis.undefined
      }
    },
    { scope: containerRef },
  )
  const forceDismissMenu = useCallback(() => {
    forceDismissNavigationMenu({
      containerRef,
      panelRef,
      setMounted,
      tlRef,
    })
  }, [containerRef, panelRef, setMounted])
  useGSAP(
    () => {
      const tl = tlRef.current
      if (!tl) {
        return
      }
      if (menuOpen) {
        setMounted(true)
        const NORMAL_TIME_SCALE = 1
        tl.timeScale(NORMAL_TIME_SCALE).play()
      } else if (tl.progress() > CONSTANTS.POS_IMMEDIATE && !tl.paused()) {
        tl.timeScale(CONSTANTS.REVERSE_TIMESCALE).reverse()
      }
    },
    { dependencies: [menuOpen] },
  )
  return {
    contextSafe,
    forceDismissMenu,
  }
}
export const useNavigationLogic = (
  containerRef: RefObject<HTMLDivElement | null>,
  panelRef: RefObject<HTMLDialogElement | null>,
  routerNavigate: (opts: { hash?: string; to?: string }) => void | Promise<void>,
) => {
  const {
    menuOpen,
    setMenuOpen,
    scrolled,
    setScrolled,
    setPendingHash: setPendingHashGlobal,
  } = useNavigationStore(
    useShallow((state) => ({
      menuOpen: state.menuOpen,
      scrolled: state.scrolled,
      setMenuOpen: state.setMenuOpen,
      setPendingHash: state.setPendingHash,
      setScrolled: state.setScrolled,
    })),
  )
  const activeImageIndex = useRef(CONSTANTS.POS_IMMEDIATE)
  const isReducedMotion = useRef(false)
  const isDesktop = useRef(true)
  const parallax = useRef<ParallaxQuickTo | undefined>(globalThis.undefined)
  const parallaxTargetRef = useRef<Element | undefined>(globalThis.undefined)
  const [mounted, setMounted] = useState<boolean>(false)
  useNavigationStateEffects({
    menuOpen,
    setMenuOpen,
    setScrolled,
  })
  const { contextSafe, forceDismissMenu } = useNavigationEffects({
    containerRef,
    isDesktop,
    isReducedMotion,
    menuOpen,
    panelRef,
    parallax,
    parallaxTargetRef,
    routerNavigate,
    setMounted,
  })
  const dismissMenuForRouteNavigation = useCallback(() => {
    setMenuOpen(false)
    setPendingHashGlobal(undefined)
    forceDismissMenu()
  }, [forceDismissMenu, setMenuOpen, setPendingHashGlobal])
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const previousPathnameRef = useRef(pathname)
  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return
    }
    previousPathnameRef.current = pathname
    dismissMenuForRouteNavigation()
  }, [dismissMenuForRouteNavigation, pathname])
  const { getHoverProps, handleHover, handleMouseMove } = useNavigationHoverLogic({
    activeImageIndex,
    contextSafe,
    isDesktop,
    isReducedMotion,
    parallax,
    parallaxTargetRef,
  })
  return {
    dismissMenuForRouteNavigation,
    getHoverProps,
    handleHover,
    handleMouseMove,
    menuOpen,
    mounted,
    scrolled,
    setMenuOpen,
    setPendingHashGlobal,
  }
}
export interface HoverOptions {
  y?: number
  scale?: number
  enterDuration?: number
  leaveDuration?: number
}
export interface HoverHandlers {
  ref: (el: HTMLElement | null) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}
interface ParallaxQuickTo {
  x: gsap.QuickToFunc
  y: gsap.QuickToFunc
}
