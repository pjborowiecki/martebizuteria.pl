import { type JSX, useEffect } from "react"

import { toast } from "sonner"
import { useTranslations } from "use-intl"
export const VerificationToast = (): JSX.Element | undefined => {
  const t = useTranslations("pages.auth.toast")
  useEffect(() => {
    const url = new URL(globalThis.location.href)
    if (url.searchParams.get(VERIFIED_PARAM) !== "true") {
      return
    }
    toast.success(t("verifiedTitle"), {
      description: t("verifiedDescription"),
    })
    url.searchParams.delete(VERIFIED_PARAM)
    globalThis.history.replaceState(undefined, "", `${url.pathname}${url.search}${url.hash}`)
  }, [t])
  return undefined
}
const VERIFIED_PARAM = "verified"
