import { useEffect, useState } from "react"
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>()
  useEffect(() => {
    const syncIsMobileFromViewport = () => {
      setIsMobile(mql.matches)
    }
    const mql = globalThis.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`)
    mql.addEventListener("change", syncIsMobileFromViewport)
    syncIsMobileFromViewport()
    return function unsubscribeFromMobileBreakpointChanges() {
      mql.removeEventListener("change", syncIsMobileFromViewport)
    }
  }, [])
  return isMobile ?? false
}
const MOBILE_MAX_WIDTH_PX = 767
