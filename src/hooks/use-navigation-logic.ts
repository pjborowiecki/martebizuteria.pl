"use client";

import { type MouseEvent, type RefObject, useCallback, useRef, useState } from "react";

import { useShallow } from "zustand/react/shallow";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";

import * as CONSTANTS from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants";
import { useNavigationStore } from "~/src/components/custom/pages/landing-page/navigation/store/navigation-store";

export interface HoverOptions {
  y?: number;
  scale?: number;
  enterDuration?: number;
  leaveDuration?: number;
}

export interface HoverHandlers {
  ref: (el: HTMLElement | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface ParallaxQuickTo {
  x: gsap.QuickToFunc;
  y: gsap.QuickToFunc;
}

function useNavigationHoverLogic({
  activeImageIndex,
  contextSafe,
  isDesktop,
  isReducedMotion,
  parallax,
  parallaxTargetRef
}: {
  activeImageIndex: RefObject<number>;
  contextSafe: <Args extends unknown[], Ret>(func: (...args: Args) => Ret) => (...args: Args) => Ret;
  isDesktop: RefObject<boolean>;
  isReducedMotion: RefObject<boolean>;
  parallax: RefObject<ParallaxQuickTo | undefined>;
  parallaxTargetRef: RefObject<Element | undefined>;
}) {
  const handleHover = contextSafe((index: number) => {
    if (activeImageIndex.current === index) {
      return;
    }
    gsap.to(`[data-menu-image="${activeImageIndex.current}"]`, {
      autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN,
      duration: CONSTANTS.DUR_FOOTER,
      ease: "power2.out",
      overwrite: "auto",
      scale: CONSTANTS.INACTIVE_SCALE
    });
    gsap.fromTo(
      `[data-menu-image="${index}"]`,
      { scale: CONSTANTS.INACTIVE_SCALE },
      {
        autoAlpha: CONSTANTS.AUTO_ALPHA_VISIBLE,
        duration: CONSTANTS.DUR_BASE,
        ease: "power3.out",
        overwrite: "auto",
        scale: CONSTANTS.ACTIVE_SCALE
      }
    );
    activeImageIndex.current = index;
  });

  const handleMouseMove = contextSafe((e: MouseEvent) => {
    if (isReducedMotion.current || !isDesktop.current) {
      return;
    }
    const el = e.currentTarget;
    if (!(el instanceof HTMLElement)) {
      return;
    }
    const xPos = (e.clientX / el.clientWidth - CONSTANTS.MOUSE_CENTER_OFFSET) * CONSTANTS.MOUSE_MULTIPLIER;
    const yPos = (e.clientY / el.clientHeight - CONSTANTS.MOUSE_CENTER_OFFSET) * CONSTANTS.MOUSE_MULTIPLIER;
    parallax.current?.x(xPos * CONSTANTS.PARALLAX_OFFSET);
    parallax.current?.y(yPos * CONSTANTS.PARALLAX_OFFSET);
    const target = parallaxTargetRef.current;
    if (target !== undefined && target !== null) {
      gsap.to(target, {
        duration: 1.5,
        ease: "power3.out",
        overwrite: "auto",
        rotationX: -yPos * CONSTANTS.ROTATION_MULTIPLIER,
        rotationY: xPos * CONSTANTS.ROTATION_MULTIPLIER
      });
    }
  });

  const getHoverProps = useCallback(
    (options?: HoverOptions): HoverHandlers => {
      const {
        y = CONSTANTS.HOVER_Y_OFFSET,
        scale = CONSTANTS.HOVER_SCALE,
        enterDuration = CONSTANTS.HOVER_ENTER_DURATION,
        leaveDuration = CONSTANTS.HOVER_LEAVE_DURATION
      } = options ?? {};
      let element: HTMLElement | undefined = globalThis.undefined;

      return {
        onMouseEnter: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return;
          }
          gsap.to(element, {
            duration: enterDuration,
            ease: "power2.out",
            overwrite: "auto",
            scale,
            y
          });
        }),
        onMouseLeave: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return;
          }
          gsap.to(element, {
            duration: leaveDuration,
            ease: "power3.inOut",
            overwrite: "auto",
            scale: CONSTANTS.ACTIVE_SCALE,
            y: CONSTANTS.POS_IMMEDIATE
          });
        }),
        ref: (el: HTMLElement | null) => {
          element = el ?? undefined;
        }
      };
    },
    [contextSafe, isReducedMotion]
  );

  return { getHoverProps, handleHover, handleMouseMove };
}

function createMenuTimeline({
  dur,
  ease,
  onReverseComplete,
  panel,
  pos
}: {
  dur: (full: number) => number;
  ease: (full: string) => string;
  onReverseComplete: () => void;
  panel: HTMLDialogElement;
  pos: (full: number) => number;
}) {
  const tl = gsap.timeline({
    defaults: { duration: dur(CONSTANTS.DUR_BASE), ease: "expo.out" },
    onReverseComplete,
    paused: true
  });

  tl.fromTo(
    panel,
    { clipPath: CONSTANTS.CLIP_CLOSED },
    {
      clipPath: CONSTANTS.CLIP_OPEN,
      duration: dur(CONSTANTS.DUR_PANEL),
      ease: ease("power3.inOut"),
      force3D: true,
      onStart: () => {
        gsap.set(panel, { autoAlpha: CONSTANTS.AUTO_ALPHA_VISIBLE });
      }
    }
  )
    .fromTo(
      "[data-menu-backdrop]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN },
      { duration: dur(CONSTANTS.DUR_BACKDROP), opacity: CONSTANTS.AUTO_ALPHA_VISIBLE },
      CONSTANTS.POS_IMMEDIATE
    )
    .fromTo(
      "[data-menu-header]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: -28 },
      {
        duration: dur(CONSTANTS.DUR_HEADER),
        ease: ease("power3.out"),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        y: CONSTANTS.POS_IMMEDIATE
      },
      pos(CONSTANTS.POS_HEADER)
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
        y: CONSTANTS.POS_IMMEDIATE
      },
      pos(CONSTANTS.POS_LINK)
    )
    .fromTo(
      "[data-menu-secondary]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: 24 },
      {
        duration: dur(CONSTANTS.DUR_BACKDROP),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        stagger: pos(CONSTANTS.STAGGER_SECONDARY),
        y: CONSTANTS.POS_IMMEDIATE
      },
      pos(CONSTANTS.POS_SECONDARY)
    )
    .fromTo(
      "[data-menu-image-container]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, scale: CONSTANTS.HOVER_SCALE },
      {
        duration: dur(CONSTANTS.DUR_IMAGE),
        ease: ease("power2.out"),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        scale: CONSTANTS.ACTIVE_SCALE
      },
      pos(CONSTANTS.POS_IMAGE)
    )
    .fromTo(
      "[data-menu-footer]",
      { opacity: CONSTANTS.AUTO_ALPHA_HIDDEN, y: 16 },
      {
        duration: dur(CONSTANTS.DUR_FOOTER),
        opacity: CONSTANTS.AUTO_ALPHA_VISIBLE,
        y: CONSTANTS.POS_IMMEDIATE
      },
      pos(CONSTANTS.POS_FOOTER)
    );

  return tl;
}

function scrollToSection(id: string, navigate: (opts: { hash?: string; to?: string }) => void | Promise<void>) {
  const el = document.querySelector(`#${CSS.escape(id)}`);
  if (!el) {
    void navigate({ hash: id, to: "/{-$locale}" });
    return;
  }
  gsap.to(globalThis, {
    duration: 0.9,
    ease: "power3.inOut",
    scrollTo: { autoKill: true, offsetY: CONSTANTS.HEADER_OFFSET_PX, y: el }
  });
}

function useNavigationStateEffects({
  menuOpen,
  setMenuOpen,
  setScrolled
}: {
  menuOpen: boolean;
  setMenuOpen: (val: boolean) => void;
  setScrolled: (val: boolean) => void;
}) {
  useGSAP(function syncScrollScrolledState() {
    const trigger = ScrollTrigger.create({
      end: "max",
      onToggle: ({ isActive }) => {
        setScrolled(isActive);
      },
      start: "top -20px"
    });
    setScrolled(trigger.isActive);
  });

  useGSAP(
    function lockScrollWhileMenuOpen() {
      if (!menuOpen) {
        return;
      }
      const scrollbarWidth = document.documentElement.offsetWidth - document.documentElement.clientWidth;
      gsap.set("html", { overflow: "hidden" });
      gsap.set("body", {
        overflow: "hidden",
        paddingRight: scrollbarWidth > CONSTANTS.POS_IMMEDIATE ? scrollbarWidth : undefined
      });
    },
    { dependencies: [menuOpen], revertOnUpdate: true }
  );

  useGSAP(
    function closeMenuOnEscape() {
      if (!menuOpen) {
        return;
      }
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMenuOpen(false);
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
      };
    },
    { dependencies: [menuOpen, setMenuOpen], revertOnUpdate: true }
  );
}

function useNavigationEffects({
  containerRef,
  isDesktop,
  isReducedMotion,
  menuOpen,
  panelRef,
  parallax,
  parallaxTargetRef,
  routerNavigate,
  setMounted
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  isDesktop: RefObject<boolean>;
  isReducedMotion: RefObject<boolean>;
  menuOpen: boolean;
  panelRef: RefObject<HTMLDialogElement | null>;
  parallax: RefObject<ParallaxQuickTo | undefined>;
  parallaxTargetRef: RefObject<Element | undefined>;
  routerNavigate: (opts: { hash?: string; to?: string }) => void | Promise<void>;
  setMounted: (val: boolean) => void;
}) {
  const tlRef = useRef<gsap.core.Timeline | undefined>(globalThis.undefined);

  const { contextSafe } = useGSAP(
    function setupMenuTimeline() {
      if (!containerRef.current || !panelRef.current) {
        return;
      }

      const imgContainer = containerRef.current.querySelector("[data-menu-image-container]");
      parallaxTargetRef.current = imgContainer ?? undefined;
      if (imgContainer) {
        const opts = { duration: 1.5, ease: "power3.out" } as const;
        parallax.current = {
          x: gsap.quickTo(imgContainer, "x", opts),
          y: gsap.quickTo(imgContainer, "y", opts)
        };
      } else {
        parallax.current = globalThis.undefined;
      }

      const mm = gsap.matchMedia();

      mm.add(
        CONSTANTS.MENU_MEDIA,
        (context) => {
          const conds = context.conditions ?? {};
          const { reduced, desktop } = conds;

          isReducedMotion.current = reduced;
          isDesktop.current = desktop;

          const dur = (full: number) => (reduced ? CONSTANTS.DUR_QUICK : full);
          const pos = (full: number) => (reduced ? CONSTANTS.POS_IMMEDIATE : full);
          const ease = (full: string) => (reduced ? "none" : full);

          const panel = panelRef.current;
          if (!panel) {
            return;
          }
          gsap.set(panel, {
            autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN,
            clipPath: CONSTANTS.CLIP_CLOSED,
            force3D: true
          });

          const tl = createMenuTimeline({
            dur,
            ease,
            onReverseComplete: () => {
              gsap.set(panel, {
                autoAlpha: CONSTANTS.AUTO_ALPHA_HIDDEN,
                clipPath: CONSTANTS.CLIP_CLOSED
              });
              setMounted(false);

              const { pendingHash, setPendingHash } = useNavigationStore.getState();
              if (pendingHash !== undefined) {
                scrollToSection(pendingHash, routerNavigate);
                setPendingHash(undefined);
              }
            },
            panel,
            pos
          });

          tlRef.current = tl;
          return () => {
            tl.kill();
            tlRef.current = undefined;
          };
        },
        containerRef
      );

      return () => {
        mm.revert();
        parallax.current = globalThis.undefined;
        parallaxTargetRef.current = globalThis.undefined;
      };
    },
    { scope: containerRef }
  );

  useGSAP(
    function syncTimelineToMenuOpen() {
      const tl = tlRef.current;
      if (!tl) {
        return;
      }
      if (menuOpen) {
        setMounted(true);
        const NORMAL_TIME_SCALE = 1;
        tl.timeScale(NORMAL_TIME_SCALE).play();
      } else if (tl.progress() > CONSTANTS.POS_IMMEDIATE) {
        tl.timeScale(CONSTANTS.REVERSE_TIMESCALE).reverse();
      }
    },
    { dependencies: [menuOpen] }
  );

  return { contextSafe };
}

export function useNavigationLogic(
  containerRef: RefObject<HTMLDivElement | null>,
  panelRef: RefObject<HTMLDialogElement | null>,
  routerNavigate: (opts: { hash?: string; to?: string }) => void | Promise<void>
) {
  const {
    menuOpen,
    setMenuOpen,
    scrolled,
    setScrolled,
    setPendingHash: setPendingHashGlobal
  } = useNavigationStore(
    useShallow((s) => ({
      menuOpen: s.menuOpen,
      scrolled: s.scrolled,
      setMenuOpen: s.setMenuOpen,
      setPendingHash: s.setPendingHash,
      setScrolled: s.setScrolled
    }))
  );

  const activeImageIndex = useRef(CONSTANTS.POS_IMMEDIATE);
  const isReducedMotion = useRef(false);
  const isDesktop = useRef(true);
  const parallax = useRef<ParallaxQuickTo | undefined>(globalThis.undefined);
  const parallaxTargetRef = useRef<Element | undefined>(globalThis.undefined);

  const [mounted, setMounted] = useState<boolean>(false);

  useNavigationStateEffects({ menuOpen, setMenuOpen, setScrolled });

  const { contextSafe } = useNavigationEffects({
    containerRef,
    isDesktop,
    isReducedMotion,
    menuOpen,
    panelRef,
    parallax,
    parallaxTargetRef,
    routerNavigate,
    setMounted
  });

  const { getHoverProps, handleHover, handleMouseMove } = useNavigationHoverLogic({
    activeImageIndex,
    contextSafe,
    isDesktop,
    isReducedMotion,
    parallax,
    parallaxTargetRef
  });

  return {
    getHoverProps,
    handleHover,
    handleMouseMove,
    menuOpen,
    mounted,
    scrolled,
    setMenuOpen,
    setPendingHashGlobal
  };
}
