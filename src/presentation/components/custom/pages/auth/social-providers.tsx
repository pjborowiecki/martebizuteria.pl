import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { GoogleIcon } from "~/src/presentation/components/custom/icons"
import { OAuthButton } from "~/src/presentation/components/custom/pages/auth/oauth-button"

export const SocialProviders = (): JSX.Element => {
  const t = useTranslations()

  return <OAuthButton provider="google" label={t("pages.auth.oauth.google")} Icon={GoogleIcon} />
}
