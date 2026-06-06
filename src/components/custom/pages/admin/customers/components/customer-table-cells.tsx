import type { JSX } from "react";

import type { User } from "~/src/modules/user/user.types";

function EmptyDash(): JSX.Element {
  return <span className="text-sm text-muted-foreground/50">—</span>;
}

export function CustomerStripeCustomerIdCell({
  stripeCustomerId
}: Readonly<{ stripeCustomerId: User["adminCustomerListItem"]["stripeCustomerId"] }>): JSX.Element {
  if (stripeCustomerId === null || stripeCustomerId === "") {
    return <EmptyDash />;
  }

  return <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{stripeCustomerId}</span>;
}

export function CustomerPhoneCell({ phone }: Readonly<{ phone: User["adminCustomerListItem"]["phone"] }>): JSX.Element {
  if (phone === null || phone === "") {
    return <EmptyDash />;
  }

  return <span className="font-mono text-sm tabular-nums">{phone}</span>;
}
