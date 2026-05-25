import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { GithubIcon, GoogleIcon } from "~/src/components/custom/icons";
import { OAuthButton } from "~/src/components/custom/pages/auth/oauth-button";

export function SocialProviders(): JSX.Element {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 gap-3">
      <OAuthButton provider="google" label={t("auth.oAuth.google")} Icon={GoogleIcon} />
      <OAuthButton provider="github" label={t("auth.oAuth.github")} Icon={GithubIcon} />
    </div>
  );
}
