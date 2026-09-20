import { type MouseEvent, type ReactNode, type RefObject, createContext, useCallback, useContext, useMemo, useRef } from "react"

import { useRouter } from "@tanstack/react-router"

import { scrollToSectionById } from "~/src/lib/lenis/scroll-to-section"

import * as CONSTANTS from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import { resolveMenuPathNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-path"
import {
  type HoverHandlers,
  type HoverOptions,
  useNavigationLogic,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-navigation-logic"
const scrollToSection = (id: string, navigate: ReturnType<typeof useRouter>["navigate"]) => {
  if (scrollToSectionById(id, CONSTANTS.HEADER_OFFSET_PX) !== undefined) {
    return
  }
  void navigate({ hash: id, to: "/{-$locale}" })
}
export const NavigationProvider = ({
  children,
}: Readonly<{
  children: ReactNode
}>) => {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  const {
    dismissMenuForRouteNavigation,
    getHoverProps,
    handleHover,
    handleMouseMove,
    menuOpen,
    mounted,
    scrolled,
    setMenuOpen,
    setPendingHashGlobal,
  } = useNavigationLogic(containerRef, panelRef, routerRef.current.navigate)
  const handleClose = useCallback(() => {
    setMenuOpen(false)
  }, [setMenuOpen])
  const handleNavigateToHash = useCallback(
    (hash: string) => {
      if (hash.startsWith("/")) {
        dismissMenuForRouteNavigation()
        const target = resolveMenuPathNavigation(hash)
        void router.navigate(
          target.params === undefined
            ? {
                to: target.to,
              }
            : {
                params: target.params,
                to: target.to,
              },
        )
        return
      }
      const id = hash.replace(/^#/u, "")
      if (menuOpen) {
        setPendingHashGlobal(id)
        setMenuOpen(false)
      } else {
        scrollToSection(id, router.navigate)
      }
    },
    [dismissMenuForRouteNavigation, menuOpen, router, setPendingHashGlobal, setMenuOpen],
  )
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
      setMenuOpen,
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
      getHoverProps,
    ],
  )
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}
export const useNavigation = (): NavigationContextValue => {
  const ctx = useContext(NavigationContext)
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return ctx
}
export interface NavigationContextValue {
  containerRef: RefObject<HTMLDivElement | null>
  panelRef: RefObject<HTMLDialogElement | null>
  mounted: boolean
  dismissMenuForRouteNavigation: () => void
  handleClose: () => void
  handleHover: (index: number) => void
  handleMouseMove: (event: MouseEvent) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  scrolled: boolean
  handleNavigateToHash: (hash: string) => void
  getHoverProps: (options?: HoverOptions) => HoverHandlers
}
const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)
