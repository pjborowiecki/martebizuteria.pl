import type { JSX } from "react";

import { FullscreenMenu } from "~/src/components/custom/landing-page/navigation/components/fullscreen-menu/fullscreen-menu";
import { BrandLogo } from "~/src/components/custom/landing-page/navigation/components/navigation/brand-logo";
import { DesktopNav } from "~/src/components/custom/landing-page/navigation/components/navigation/desktop-nav";
import { MobileMenuToggle } from "~/src/components/custom/landing-page/navigation/components/navigation/mobile-menu-toggle";
import { NavigationHeader } from "~/src/components/custom/landing-page/navigation/components/navigation/navigation-header";
import { NavigationProvider } from "~/src/components/custom/landing-page/navigation/components/navigation/navigation-provider";
import { UserUtilityNav } from "~/src/components/custom/landing-page/navigation/components/navigation/user-utility-nav";
import { SearchOverlay } from "~/src/components/custom/landing-page/navigation/components/search/search-overlay";

export { NAVIGATION_MENU_ID } from "~/src/components/custom/landing-page/navigation/constants";

export function Navigation(): JSX.Element {
  return (
    <NavigationProvider>
      <NavigationHeader>
        <div className="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 lg:gap-8">
          <div className="flex h-full min-w-0 items-center justify-start gap-5 lg:gap-8">
            <MobileMenuToggle />
            <DesktopNav />
          </div>

          <BrandLogo />
          <UserUtilityNav />
        </div>
      </NavigationHeader>

      <FullscreenMenu />
      <SearchOverlay />
    </NavigationProvider>
  );
}
