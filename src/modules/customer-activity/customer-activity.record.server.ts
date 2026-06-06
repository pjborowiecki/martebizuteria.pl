import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "~/src/integrations/better-auth/auth._server";

import {
  recordCustomerCartAbandonedAudit,
  recordCustomerCartItemAddedAudit,
  recordCustomerPageViewedAudit,
  resolveAuthAuditActor
} from "~/src/modules/audit-log/audit-log.events.server";
import { resolveRequestAuditIp } from "~/src/modules/audit-log/audit-log.record.server";
import type { CustomerActivity } from "~/src/modules/customer-activity/customer-activity.types";

const SINGLE_QUANTITY = 1;

export async function recordCustomerActivity(input: CustomerActivity["recordInput"]): Promise<{ ok: true; recorded: boolean }> {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  const user = session?.user;

  if (user === undefined) {
    return { ok: true, recorded: false };
  }

  const actor = resolveAuthAuditActor(user);
  const ip = resolveRequestAuditIp();
  const baseOptions = { ip, resourceId: user.id };

  if (input.kind === "cart_item_added") {
    const quantityLabel = input.quantity === SINGLE_QUANTITY ? "" : ` ×${input.quantity}`;
    const variantSuffix = input.variantTitle !== undefined && input.variantTitle !== "" ? ` (${input.variantTitle})` : "";

    recordCustomerCartItemAddedAudit(actor, {
      ...baseOptions,
      detail: `${input.productTitle}${variantSuffix}${quantityLabel}`,
      metadata: {
        productTitle: input.productTitle,
        quantity: input.quantity,
        variantId: input.variantId,
        variantTitle: input.variantTitle
      }
    });
  }

  if (input.kind === "cart_abandoned") {
    recordCustomerCartAbandonedAudit(actor, {
      ...baseOptions,
      detail: `${input.itemCount} items in cart`,
      metadata: {
        itemCount: input.itemCount,
        lineCount: input.lineCount
      }
    });
  }

  if (input.kind === "page_viewed") {
    recordCustomerPageViewedAudit(actor, {
      ...baseOptions,
      detail: input.path,
      metadata: { path: input.path }
    });
  }

  return { ok: true, recorded: true };
}
