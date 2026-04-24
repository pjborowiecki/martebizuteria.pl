import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH_PX = 767;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>();

  useEffect(function subscribeToMobileBreakpointChanges() {
    const mql = globalThis.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);

    function syncIsMobileFromViewport() {
      setIsMobile(mql.matches);
    }

    mql.addEventListener("change", syncIsMobileFromViewport);
    syncIsMobileFromViewport();

    return function unsubscribeFromMobileBreakpointChanges() {
      mql.removeEventListener("change", syncIsMobileFromViewport);
    };
  }, []);

  return isMobile ?? false;
}
