import { useEffect, useState } from "react"

import { useSession } from "~/src/integrations/better-auth/auth-client"
import { DEFAULT_TIMEZONE } from "~/src/integrations/use-intl/i18n.timezones"
export const useTimeZone = (): string => {
  const [detected, setDetected] = useState<string>()
  const { data: session } = useSession()
  useEffect(() => {
    setDetected(new Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])
  return session?.user.timezone ?? detected ?? DEFAULT_TIMEZONE
}
