import { createServerFn } from "@tanstack/react-start";

import { orderAdminMutations } from "~/src/modules/order/order.admin-mutations.server";
import { orderZodSchemas } from "~/src/modules/order/order.zod";

const fulfillAdminOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(({ data: { orderId } }) => orderAdminMutations.fulfillAdminOrder(orderId));

const markAdminOrderShippedFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(({ data: { orderId } }) => orderAdminMutations.markAdminOrderShipped(orderId));

const cancelAdminOrderFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderZodSchemas.adminOrderIdInput.parse(data))
  .handler(({ data: { orderId } }) => orderAdminMutations.cancelAdminOrder(orderId));

export const orderAdminMutationFns = {
  cancelAdminOrderFn,
  fulfillAdminOrderFn,
  markAdminOrderShippedFn
};
