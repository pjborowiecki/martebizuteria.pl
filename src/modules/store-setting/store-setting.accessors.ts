import { eq, ne } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { STORE_SETTING_ID } from "~/src/modules/store-setting/store-setting.constants"
import { storeSetting } from "~/src/modules/store-setting/store-setting.schema"

export const isSalesPaused = async (): Promise<boolean> => {
  const [row] = await db
    .select({ salesPaused: storeSetting.salesPaused })
    .from(storeSetting)
    .where(eq(storeSetting.id, STORE_SETTING_ID))
    .limit(1)

  return row?.salesPaused === true
}

export const changeSalesPaused = async (salesPaused: boolean): Promise<boolean> => {
  const changed = await db
    .insert(storeSetting)
    .values({ id: STORE_SETTING_ID, salesPaused })
    .onConflictDoUpdate({ set: { salesPaused }, setWhere: ne(storeSetting.salesPaused, salesPaused), target: storeSetting.id })
    .returning({ id: storeSetting.id })

  return changed.length > 0
}
