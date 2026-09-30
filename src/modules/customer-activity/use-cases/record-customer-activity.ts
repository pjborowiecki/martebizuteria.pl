import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import {
  recordCustomerCartAbandonedAudit,
  recordCustomerCartItemAddedAudit,
  recordCustomerPageViewedAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { resolveRequestAuditIp } from "~/src/modules/audit-log/audit-log.record.server"
import { customerActivityZodSchemas } from "~/src/modules/customer-activity/customer-activity.zod"

export const recordCustomerActivity = createServerFn({ method: "POST" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof customerActivityZodSchemas.recordInput>) => customerActivityZodSchemas.recordInput.parse(input))
  .handler(async ({ data: input }): Promise<{ ok: true; recorded: boolean }> => {
    const session = await getRequestSession()
    const user = session?.user

    if (user === undefined) {
      return { ok: true, recorded: false }
    }

    const actor = resolveAuthAuditActor(user)
    const ip = resolveRequestAuditIp()
    const baseOptions = { ip, resourceId: user.id }

    if (input.kind === "cart_item_added") {
      const quantityLabel = input.quantity === 1 ? "" : ` ×${input.quantity}`
      const variantSuffix = input.variantTitle !== undefined && input.variantTitle !== "" ? ` (${input.variantTitle})` : ""

      recordCustomerCartItemAddedAudit(actor, {
        ...baseOptions,
        detail: `${input.productTitle}${variantSuffix}${quantityLabel}`,
        metadata: {
          productTitle: input.productTitle,
          quantity: input.quantity,
          variantId: input.variantId,
          variantTitle: input.variantTitle,
        },
      })
    }

    if (input.kind === "cart_abandoned") {
      recordCustomerCartAbandonedAudit(actor, {
        ...baseOptions,
        detail: `${input.itemCount} items in cart`,
        metadata: {
          itemCount: input.itemCount,
          lineCount: input.lineCount,
        },
      })
    }

    if (input.kind === "page_viewed") {
      recordCustomerPageViewedAudit(actor, {
        ...baseOptions,
        detail: input.path,
        metadata: { path: input.path },
      })
    }

    return { ok: true, recorded: true }
  })
