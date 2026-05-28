import { and, eq } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { courier } from "~/src/modules/courier/courier.schema";
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema";

const getActiveDeliveryMethodsQuery = () =>
  db
    .select({
      courier,
      deliveryMethod
    })
    .from(deliveryMethod)
    .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
    .where(and(eq(deliveryMethod.isActive, true), eq(courier.isActive, true)));

const getActiveDeliveryMethodByIdQuery = (id: string) =>
  db.query.deliveryMethod.findFirst({
    where: and(eq(deliveryMethod.id, id), eq(deliveryMethod.isActive, true))
  });

export const deliveryMethodAccessors = {
  getActiveDeliveryMethodByIdQuery,
  getActiveDeliveryMethodsQuery
};
