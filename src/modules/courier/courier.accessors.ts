import { asc, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { courier } from "~/src/modules/courier/courier.schema"

const courierColumns = { id: courier.id, internalCode: courier.internalCode, isActive: courier.isActive, name: courier.name }

export const listCouriers = () => db.select(courierColumns).from(courier).orderBy(asc(courier.name))

export const findCourierById = async (id: string) => {
  const [row] = await db.select(courierColumns).from(courier).where(eq(courier.id, id)).limit(1)

  return row
}
