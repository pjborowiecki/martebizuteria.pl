import { type CSSProperties, type JSX, useMemo } from "react"

import { ImageShowcase } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/image-showcase"
import { MenuFooter } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/menu-footer"
import { MenuHeader } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/menu-header"
import { PrimaryNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/primary-nav"
import { SecondaryNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/secondary-nav"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { NAVIGATION_MENU_ID } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

export const FullscreenMenu = (): JSX.Element => {
  const { containerRef, panelRef, mounted, handleClose, handleMouseMove } = useNavigation()
  const overlayStyle = useMemo<CSSProperties>(() => ({ pointerEvents: mounted ? "auto" : "none" }), [mounted])
  const hiddenMenuStyle = useMemo<CSSProperties>(
    () => ({ display: "flex", opacity: 0, pointerEvents: mounted ? "auto" : "none", visibility: "hidden" }),
    [mounted],
  )

  return (
    <div ref={containerRef}>
      <div
        data-menu-backdrop
        aria-hidden
        className="pointer-events-none fixed inset-0 z-200 bg-primary opacity-0"
        style={overlayStyle}
        onPointerDown={handleClose}
      />

      <dialog
        ref={panelRef}
        className="fixed inset-0 z-200 m-0 flex h-dvh max-h-none min-h-0 w-screen max-w-none flex-col overflow-hidden border-none bg-primary p-0 text-primary-foreground"
        style={hiddenMenuStyle}
        id={NAVIGATION_MENU_ID}
        aria-modal={mounted}
        aria-hidden={!mounted}
        onMouseMove={handleMouseMove}
      >
        <MenuHeader />

        <div className="mx-auto flex min-h-0 w-full max-w-400 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="flex min-h-max w-full flex-col justify-center px-6 py-16 lg:min-h-full lg:w-1/2 lg:px-12 lg:py-0">
            <PrimaryNav />
            <SecondaryNav />
          </div>
          <ImageShowcase />
        </div>

        <MenuFooter />
      </dialog>
    </div>
  )
}
