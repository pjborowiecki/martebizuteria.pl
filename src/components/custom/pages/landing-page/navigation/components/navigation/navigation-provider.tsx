"use client";

import { type ReactNode, type RefObject, createContext, useCallback, useContext, useMemo, useRef } from "react";

import { useRouter } from "@tanstack/react-router";

import * as CONSTANTS from "./navigation-constants";
import { type HoverHandlers, type HoverOptions, useNavigationLogic } from "~/src/hooks/use-navigation-logic";
import type { FileRouteTypes } from "~/src/routeTree.gen";

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
    scrollTo: { autoKill: true, offsetY: CONSTANTS.HEADER_OFFSET_PX, y: el }
  });
}

export interface NavigationContextValue {
  containerRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
  mounted: boolean;
  handleClose: () => void;
  handleHover: (index: number) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  scrolled: boolean;
  handleNavigateToHash: (hash: string) => void;
  getHoverProps: (options?: HoverOptions) => HoverHandlers;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);

  const { getHoverProps, handleHover, handleMouseMove, menuOpen, mounted, scrolled, setMenuOpen, setPendingHashGlobal } =
    useNavigationLogic(containerRef, panelRef, routerRef.current.navigate);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleNavigateToHash = useCallback(
    (hash: string) => {
      if (hash.startsWith("/")) {
        if (menuOpen) {
          setMenuOpen(false);
        }
        void router.navigate({ to: menuPathToRouterTo(hash) });
        return;
      }
      const id = hash.replace(/^#/u, "");
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
