import { and, asc, eq, isNull, max, sql } from "drizzle-orm"

import { chunkRankUpdates, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { courier } from "~/src/modules/courier/courier.schema"
import { deliveryMethod } from "~/src/modules/delivery-method/delivery-method.schema"
import { STORE_SETTING_ID } from "~/src/modules/store-setting/store-setting.constants"
import { storeSetting } from "~/src/modules/store-setting/store-setting.schema"

export const offeredDeliveryMethod = and(eq(deliveryMethod.isActive, true), isNull(deliveryMethod.archivedAt), eq(courier.isActive, true))

export const deliveryMethodOrder = [asc(deliveryMethod.rank), asc(deliveryMethod.createdAt)]

export const getOfferedDeliveryMethodByIdQuery = async (id: string) => {
  const offeredMethod = and(eq(deliveryMethod.id, id), offeredDeliveryMethod)
  const methodQuery = db
    .select({ price: deliveryMethod.price, type: deliveryMethod.type })
    .from(deliveryMethod)
    .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
    .where(offeredMethod)
    .limit(1)
  const settingQuery = db
    .select({ freeDeliveryThreshold: storeSetting.freeDeliveryThreshold })
    .from(storeSetting)
    .where(eq(storeSetting.id, STORE_SETTING_ID))
    .limit(1)
  const [[method], [setting]] = await db.batch([methodQuery, settingQuery])

  return method === undefined ? undefined : { ...method, freeDeliveryThreshold: setting?.freeDeliveryThreshold ?? undefined }
}

export const listOfferedDeliveryMethods = () =>
  db
    .select({ id: deliveryMethod.id, type: deliveryMethod.type })
    .from(deliveryMethod)
    .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
    .where(offeredDeliveryMethod)

export const listAdminDeliveryMethodRows = () =>
  db
    .select({
      courier: { id: courier.id, internalCode: courier.internalCode, isActive: courier.isActive, name: courier.name },
      deliveryMethod,
    })
    .from(deliveryMethod)
    .innerJoin(courier, eq(deliveryMethod.courierId, courier.id))
    .orderBy(...deliveryMethodOrder)

export const findDeliveryMethodById = (id: string) =>
  db.query.deliveryMethod.findFirst({
    where: eq(deliveryMethod.id, id),
    with: { courier: { columns: { isActive: true } } },
  })

export const nextDeliveryMethodRank = async (): Promise<number> => {
  const [row] = await db.select({ rank: max(deliveryMethod.rank) }).from(deliveryMethod)

  return (row?.rank ?? -1) + 1
}

export const insertDeliveryMethod = async ({
  method,
  newCourier,
}: Readonly<{ method: typeof deliveryMethod.$inferInsert; newCourier: typeof courier.$inferInsert | undefined }>): Promise<void> => {
  const insertMethod = db.insert(deliveryMethod).values(method)
  await (newCourier === undefined ? insertMethod : db.batch([db.insert(courier).values(newCourier), insertMethod]))
}

export const updateDeliveryMethodIfUnchanged = async ({
  expectedUpdatedAt,
  id,
  values,
}: Readonly<{ expectedUpdatedAt: Date; id: string; values: Partial<typeof deliveryMethod.$inferInsert> }>) => {
  const [row] = await db
    .update(deliveryMethod)
    .set(values)
    .where(and(eq(deliveryMethod.id, id), eq(deliveryMethod.updatedAt, expectedUpdatedAt)))
    .returning({ id: deliveryMethod.id })

  return row
}

export const setDeliveryMethodArchived = async (id: string, archived: boolean): Promise<void> => {
  await db
    .update(deliveryMethod)
    .set({ archivedAt: archived ? new Date() : sql`NULL`, isActive: false })
    .where(eq(deliveryMethod.id, id))
}

export const setDeliveryMethodRanks = async (orderedIds: readonly string[]): Promise<void> => {
  await runDrizzleBatch(
    chunkRankUpdates(
      deliveryMethod.id,
      orderedIds.map((id, rank) => ({ id, rank })),
    ).map(({ ids, rank }) => db.update(deliveryMethod).set({ rank }).where(inJsonList(deliveryMethod.id, ids))),
  )
}
