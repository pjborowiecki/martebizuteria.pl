"use client";

import type { JSX } from "react";

import { ImageShowcase } from "~/src/components/custom/landing/navigation/components/fullscreen-menu/image-showcase";
import { MenuFooter } from "~/src/components/custom/landing/navigation/components/fullscreen-menu/menu-footer";
import { MenuHeader } from "~/src/components/custom/landing/navigation/components/fullscreen-menu/menu-header";
import { PrimaryNav } from "~/src/components/custom/landing/navigation/components/fullscreen-menu/primary-nav";
import { SecondaryNav } from "~/src/components/custom/landing/navigation/components/fullscreen-menu/secondary-nav";
import { useNavigation } from "~/src/components/custom/landing/navigation/components/navigation/navigation-provider";
import { NAVIGATION_MENU_ID } from "~/src/components/custom/landing/navigation/constants";

export function FullscreenMenu(): JSX.Element {
  const { containerRef, panelRef, mounted, handleClose, handleMouseMove } = useNavigation();

  return (
    <div ref={containerRef}>
      <div
        data-menu-backdrop
        aria-hidden
        className="pointer-events-none fixed inset-0 z-200 bg-primary opacity-0"
        style={{ pointerEvents: mounted ? "auto" : "none" }}
        onPointerDown={handleClose}
      />

      <dialog
        ref={panelRef}
        className="fixed inset-0 z-200 m-0 flex h-dvh max-h-none min-h-0 w-screen max-w-none flex-col overflow-hidden border-none bg-primary p-0 text-primary-foreground"
        style={{
          display: "flex",
          opacity: 0,
          visibility: "hidden"
        }}
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
  );
}
