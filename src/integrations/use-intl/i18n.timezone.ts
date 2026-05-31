import { useEffect, useState } from "react";

import { CONSTANTS } from "~/src/constants";

import { useSession } from "~/src/integrations/better-auth/auth._client";

export function useTimeZone(): string {
  const [detected, setDetected] = useState<string>();
  const { data: session } = useSession();

  useEffect(() => {
    setDetected(new Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return session?.user.timezone ?? detected ?? CONSTANTS.DEFAULT_TIMEZONE;
}
