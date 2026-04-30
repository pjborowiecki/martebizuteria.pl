"use client";

import { type MouseEvent, type ReactNode, type RefObject, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { useRouter } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { gsap, ScrollTrigger, useGSAP } from "~/src/lib/gsap";

import { useNavigationStore } from "~/src/components/custom/landing/navigation/store/navigation-store";

import type { FileRouteTypes } from "~/src/routeTree.gen";

const CLIP_CLOSED = "inset(0 0 100% 0)";
const CLIP_OPEN = "inset(0 0 0% 0)";
const HEADER_OFFSET_PX = 96;

const MENU_MEDIA = {
  desktop: "(min-width: 1024px)",
  mobile: "(max-width: 1023px)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)"
} as const;

type RouterTo = FileRouteTypes["to"];

function isRouterTo(_path: string): _path is RouterTo {
  return true;
}

function menuPathToRouterTo(path: string): RouterTo {
  if (path === "/") {
    return "/{-$locale}";
  }
  const toPath = `/{-$locale}${path}`;
  return isRouterTo(toPath) ? toPath : "/{-$locale}";
}

function scrollToSection(id: string, navigate: ReturnType<typeof useRouter>["navigate"]) {
  const el = document.querySelector(`#${CSS.escape(id)}`);
  if (!el) {
    void navigate({ hash: id, to: "/{-$locale}" });
    return;
  }
  gsap.to(globalThis, {
    duration: 0.9,
    ease: "power3.inOut",
    scrollTo: { autoKill: true, offsetY: HEADER_OFFSET_PX, y: el }
  });
}

interface HoverOptions {
  y?: number;
  scale?: number;
  enterDuration?: number;
  leaveDuration?: number;
}

interface HoverHandlers {
  ref: (el: HTMLElement | null) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export interface NavigationContextValue {
  containerRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
  mounted: boolean;
  handleClose: () => void;
  handleHover: (index: number) => void;
  handleMouseMove: (e: MouseEvent) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  scrolled: boolean;
  handleNavigateToHash: (hash: string) => void;
  getHoverProps: (options?: HoverOptions) => HoverHandlers;
}

interface ParallaxQuickTo {
  x: gsap.QuickToFunc;
  y: gsap.QuickToFunc;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const tlRef = useRef<gsap.core.Timeline | undefined>(globalThis.undefined);
  const activeImageIndex = useRef(0);
  const isReducedMotion = useRef(false);
  const isDesktop = useRef(true);
  const parallax = useRef<ParallaxQuickTo | undefined>(globalThis.undefined);
  const parallaxTargetRef = useRef<Element | undefined>(globalThis.undefined);

  const [mounted, setMounted] = useState<boolean>(false);

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
        paddingRight: scrollbarWidth > 0 ? scrollbarWidth : undefined
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
        MENU_MEDIA,
        (context) => {
          const conds = context.conditions ?? {};
          const { reduced, desktop } = conds;

          isReducedMotion.current = reduced;
          isDesktop.current = desktop;

          const dur = (full: number) => (reduced ? 0.01 : full);
          const pos = (full: number) => (reduced ? 0 : full);
          const ease = (full: string) => (reduced ? "none" : full);

          const panel = panelRef.current;
          if (!panel) {
            return;
          }
          gsap.set(panel, { autoAlpha: 0, clipPath: CLIP_CLOSED, force3D: true });

          const tl = gsap.timeline({
            defaults: { duration: dur(1.2), ease: "expo.out" },
            onReverseComplete: () => {
              gsap.set(panel, { autoAlpha: 0, clipPath: CLIP_CLOSED });
              setMounted(false);

              const { pendingHash, setPendingHash } = useNavigationStore.getState();
              if (pendingHash !== undefined) {
                scrollToSection(pendingHash, routerRef.current.navigate);
                setPendingHash(undefined);
              }
            },
            paused: true
          });

          tl.fromTo(
            panel,
            { clipPath: CLIP_CLOSED },
            {
              clipPath: CLIP_OPEN,
              duration: dur(1.05),
              ease: ease("power3.inOut"),
              force3D: true,
              onStart: () => {
                gsap.set(panel, { autoAlpha: 1 });
              }
            }
          )
            .fromTo("[data-menu-backdrop]", { opacity: 0 }, { duration: dur(0.85), opacity: 1 }, 0)
            .fromTo(
              "[data-menu-header]",
              { opacity: 0, y: -28 },
              { duration: dur(0.65), ease: ease("power3.out"), opacity: 1, y: 0 },
              pos(0.12)
            )
            .fromTo(
              "[data-menu-link]",
              { opacity: 0, rotateZ: 2, y: 56 },
              { clearProps: "transform", duration: dur(0.95), ease: ease("power3.out"), opacity: 1, rotateZ: 0, stagger: pos(0.07), y: 0 },
              pos(0.18)
            )
            .fromTo(
              "[data-menu-secondary]",
              { opacity: 0, y: 24 },
              { duration: dur(0.85), opacity: 1, stagger: pos(0.05), y: 0 },
              pos(0.45)
            )
            .fromTo(
              "[data-menu-image-container]",
              { opacity: 0, scale: 1.08 },
              { duration: dur(1.25), ease: ease("power2.out"), opacity: 1, scale: 1 },
              pos(0.12)
            )
            .fromTo("[data-menu-footer]", { opacity: 0, y: 16 }, { duration: dur(0.6), opacity: 1, y: 0 }, pos(0.55));

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
        tl.timeScale(1).play();
      } else if (tl.progress() > 0) {
        tl.timeScale(1.6).reverse();
      }
    },
    { dependencies: [menuOpen] }
  );

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleHover = contextSafe((index: number) => {
    if (activeImageIndex.current === index) {
      return;
    }
    gsap.to(`[data-menu-image="${activeImageIndex.current}"]`, {
      autoAlpha: 0,
      duration: 0.6,
      ease: "power2.out",
      overwrite: "auto",
      scale: 1.05
    });
    gsap.fromTo(
      `[data-menu-image="${index}"]`,
      { scale: 1.05 },
      { autoAlpha: 1, duration: 1.2, ease: "power3.out", overwrite: "auto", scale: 1 }
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
    const xPos = (e.clientX / el.clientWidth - 0.5) * 2;
    const yPos = (e.clientY / el.clientHeight - 0.5) * 2;
    parallax.current?.x(xPos * 25);
    parallax.current?.y(yPos * 25);
    const target = parallaxTargetRef.current;
    if (target !== undefined && target !== null) {
      gsap.to(target, {
        duration: 1.5,
        ease: "power3.out",
        overwrite: "auto",
        rotationX: -yPos * 6,
        rotationY: xPos * 6
      });
    }
  });

  const getHoverProps = useCallback(
    (options?: HoverOptions): HoverHandlers => {
      const { y = -2, scale = 1.08, enterDuration = 0.42, leaveDuration = 0.48 } = options ?? {};
      let element: HTMLElement | undefined = globalThis.undefined;

      return {
        onMouseEnter: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return;
          }
          gsap.to(element, { y, scale, duration: enterDuration, ease: "power2.out", overwrite: "auto" });
        }),
        onMouseLeave: contextSafe(() => {
          if (isReducedMotion.current || !element) {
            return;
          }
          gsap.to(element, { y: 0, scale: 1, duration: leaveDuration, ease: "power3.inOut", overwrite: "auto" });
        }),
        ref: (el: HTMLElement | null) => {
          element = el ?? undefined;
        }
      };
    },
    [contextSafe]
  );

  const handleNavigateToHash = useCallback(
    (hash: string) => {
      if (hash.startsWith("/")) {
        if (menuOpen) {
          setMenuOpen(false);
        }
        void router.navigate({ to: menuPathToRouterTo(hash) });
        return;
      }
      const id = hash.replace(/^#/, "");
      if (menuOpen) {
        setPendingHashGlobal(id);
        setMenuOpen(false);
      } else {
        scrollToSection(id, router.navigate);
      }
    },
    [menuOpen, router, setPendingHashGlobal, setMenuOpen]
  );

  const value = useMemo(
    (): NavigationContextValue => ({
      containerRef,
      getHoverProps,
      handleClose,
      handleHover,
      handleMouseMove,
      handleNavigateToHash,
      menuOpen,
      mounted,
      panelRef,
      scrolled,
      setMenuOpen
    }),
    [handleClose, handleHover, handleMouseMove, mounted, menuOpen, handleNavigateToHash, scrolled, setMenuOpen, getHoverProps]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}
