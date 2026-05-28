import type { JSX } from "react";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";

export function CheckoutHeader(): JSX.Element {
  return (
    <header className="pb-10 md:pb-12">
      <LocalizedLink to="/" className="font-serif text-2xl leading-none tracking-tight text-foreground uppercase md:text-3xl">
        {CONSTANTS.APP_NAME}
      </LocalizedLink>
    </header>
  );
}
