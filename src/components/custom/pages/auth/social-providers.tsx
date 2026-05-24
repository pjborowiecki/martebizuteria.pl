import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { FacebookIcon, GoogleIcon } from "~/src/components/custom/icons";

export function SocialProviders(): JSX.Element {
  const t = useTranslations("components.custom.socialProviders");

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button type="button" variant="outline" size="xl" className="w-full gap-3 border-border/50 hover:border-border">
        <GoogleIcon className="size-4" />
        {t("google")}
      </Button>
      <Button type="button" variant="outline" size="xl" className="w-full gap-3 border-border/50 hover:border-border">
        <FacebookIcon className="size-4 text-[#1877F2]" />
        {t("facebook")}
      </Button>
    </div>
  );
}
