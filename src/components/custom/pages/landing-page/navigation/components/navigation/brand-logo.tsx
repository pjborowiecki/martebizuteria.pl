"";

import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";

export function BrandLogo(): JSX.Element {
  const t = useTranslations("components.custom.navigation");
  const { getHoverProps } = useNavigation();
  const hover = getHoverProps({ scale: 1.035, y: 0 });

  const handleMouseEnter = hover.onMouseEnter;
  const handleMouseLeave = hover.onMouseLeave;

  return (
    <div className="flex h-full min-w-0 items-center justify-center self-center px-2 pt-1 text-center">
      <span ref={hover.ref} className="inline-block origin-center will-change-transform">
        <LocalizedLink
          to={CONSTANTS.ROUTES.HOME}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="font-serif text-3xl leading-none tracking-tight text-foreground uppercase md:text-4xl"
        >
          {t("brand")}
        </LocalizedLink>
      </span>
    </div>
  );
}
