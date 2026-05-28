import { useCallback, type JSX } from "react";

import { MapPin } from "lucide-react";
import { useTranslations } from "use-intl";

import { MIN_CITY_LENGTH } from "~/src/integrations/inpost/inpost.queries";
import type { InpostPointParsed } from "~/src/integrations/inpost/inpost.zod";

import { Input } from "~/src/components/shadcn/input";

import { useInpost } from "~/src/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider";
import { InpostSidebarItem } from "~/src/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-sidebar-item";

const stopPropagation = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

function isCityLongEnough(city: string): boolean {
  return city.trim().length >= MIN_CITY_LENGTH;
}

function isCityTooShort(city: string): boolean {
  const { length } = city.trim();
  return Boolean(length) && length < MIN_CITY_LENGTH;
}

function hasResults(points: readonly InpostPointParsed[] | undefined): points is readonly InpostPointParsed[] {
  if (points === undefined) {
    return false;
  }
  const { length } = points;
  return Boolean(length);
}

function hasNoResults(points: readonly InpostPointParsed[] | undefined): boolean {
  if (points === undefined) {
    return false;
  }
  const { length } = points;
  return !length;
}

export function InpostSidebar(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { cityInput, isLoading, points, setCityInput } = useInpost();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCityInput(e.target.value);
    },
    [setCityInput]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 p-4">
        <div className="relative">
          <MapPin className="absolute top-3.5 left-2.5 size-4 text-muted-foreground" />
          <Input className="min-h-11 pl-9" onChange={handleChange} placeholder={t("searchCity")} value={cityInput} />
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain p-2" onTouchMove={stopPropagation} onWheel={stopPropagation}>
          {isLoading && isCityLongEnough(cityInput) && (
            <div className="py-6 text-center">
              <p className="animate-pulse text-xs text-muted-foreground">{t("loadingLockers")}</p>
            </div>
          )}

          {!isLoading && hasNoResults(points) && isCityLongEnough(cityInput) && (
            <div className="py-6 text-center text-xs">
              <span className="text-muted-foreground">{t("noLockers")}</span>
            </div>
          )}

          {isCityTooShort(cityInput) && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">{t("minChars")}</p>
            </div>
          )}

          {hasResults(points) && (
            <div className="flex flex-col gap-1">
              {points.map((point) => (
                <InpostSidebarItem key={point.name} point={point} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
