import { eq } from "drizzle-orm";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";
import { notifyOrderShipped } from "~/src/integrations/resend/order-shipped.notification.server";

import {
  recordOrderCancelledAudit,
  recordOrderFulfillmentStartedAudit,
  recordOrderShippedAudit
} from "~/src/modules/audit-log/audit-log.events.server";
import { canCancelAdminOrder, canFulfillAdminOrder, canMarkAdminOrderShipped } from "~/src/modules/order/order.admin-actions.utils";
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants";
import { order } from "~/src/modules/order/order.schema";
import type { Order } from "~/src/modules/order/order.types";

interface AdminOrderActionRow {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"];
  readonly status: Order["select"]["status"];
}

function getAdminOrderActionRow(orderId: string): Promise<AdminOrderActionRow | undefined> {
  return db.query.order.findFirst({
    columns: { fulfillmentStatus: true, status: true },
    where: eq(order.id, orderId)
  });
}

function assertOrderActionState(
  row: AdminOrderActionRow | undefined,
  predicate: (snapshot: AdminOrderActionRow) => boolean
): AdminOrderActionRow {
  if (row === undefined) {
    throw new Error(ORDER_ERROR_CODES.NOT_FOUND);
  }

  if (!predicate(row)) {
    throw new Error(ORDER_ERROR_CODES.INVALID_STATE);
  }

  return row;
}

async function fulfillAdminOrder(orderId: string): Promise<{ ok: true; orderId: string }> {
  await assertAdmin();

  const row = assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
    canFulfillAdminOrder({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status })
  );

  await db
    .update(order)
    .set({
      fulfillmentStatus: "fulfilled",
      status: row.status === "pending" ? "processing" : row.status,
      updatedAt: new Date()
    })
    .where(eq(order.id, orderId));

  recordOrderFulfillmentStartedAudit(orderId);

  return { ok: true, orderId };
}

async function markAdminOrderShipped(orderId: string): Promise<{ ok: true; orderId: string }> {
  await assertAdmin();

  assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) =>
    canMarkAdminOrderShipped({ fulfillmentStatus: snapshot.fulfillmentStatus, paymentUiKey: "paid", status: snapshot.status })
  );

  await db
    .update(order)
    .set({
      fulfillmentStatus: "shipped",
      shippedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(order.id, orderId));

  recordOrderShippedAudit(orderId);
  scheduleBackgroundWork(notifyOrderShipped(orderId));

  return { ok: true, orderId };
}

async function cancelAdminOrder(orderId: string): Promise<{ ok: true; orderId: string }> {
  await assertAdmin();

  assertOrderActionState(await getAdminOrderActionRow(orderId), (snapshot) => canCancelAdminOrder({ status: snapshot.status }));

  await db
    .update(order)
    .set({
      canceledAt: new Date(),
      fulfillmentStatus: "cancelled",
      status: "cancelled",
      updatedAt: new Date()
    })
    .where(eq(order.id, orderId));

  recordOrderCancelledAudit(orderId);

  return { ok: true, orderId };
}

export const orderAdminMutations = {
  cancelAdminOrder,
  fulfillAdminOrder,
  markAdminOrderShipped
};
