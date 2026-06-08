import { createContext, type MouseEvent, type ReactNode, type RefObject, useCallback, useContext, useMemo, useRef } from "react";

import { useRouter } from "@tanstack/react-router";

import { scrollToSectionById } from "~/src/lib/lenis/scroll-to-section";

import { resolveMenuPathNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-path";

import * as CONSTANTS from "./navigation-constants";
import { type HoverHandlers, type HoverOptions, useNavigationLogic } from "~/src/hooks/use-navigation-logic";

function scrollToSection(id: string, navigate: ReturnType<typeof useRouter>["navigate"]) {
  if (scrollToSectionById(id, CONSTANTS.HEADER_OFFSET_PX) !== undefined) {
    return;
  }

  void navigate({ hash: id, to: "/{-$locale}" });
}

export interface NavigationContextValue {
  containerRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDialogElement | null>;
  mounted: boolean;
  dismissMenuForRouteNavigation: () => void;
  handleClose: () => void;
  handleHover: (index: number) => void;
  handleMouseMove: (e: MouseEvent) => void;
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

  const {
    dismissMenuForRouteNavigation,
    getHoverProps,
    handleHover,
    handleMouseMove,
    menuOpen,
    mounted,
    scrolled,
    setMenuOpen,
    setPendingHashGlobal
  } = useNavigationLogic(containerRef, panelRef, routerRef.current.navigate);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleNavigateToHash = useCallback(
    (hash: string) => {
      if (hash.startsWith("/")) {
        dismissMenuForRouteNavigation();
        const target = resolveMenuPathNavigation(hash);
        void router.navigate(target.params === undefined ? { to: target.to } : { params: target.params, to: target.to });
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
    [dismissMenuForRouteNavigation, menuOpen, router, setPendingHashGlobal, setMenuOpen]
  );

  const value = useMemo(
    (): NavigationContextValue => ({
      containerRef,
      dismissMenuForRouteNavigation,
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
    [
      dismissMenuForRouteNavigation,
      handleClose,
      handleHover,
      handleMouseMove,
      mounted,
      menuOpen,
      handleNavigateToHash,
      scrolled,
      setMenuOpen,
      getHoverProps
    ]
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
