import { and, eq, ne, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { STORE_SETTING_ID } from "~/src/modules/store-setting/store-setting.constants"
import { storeSetting } from "~/src/modules/store-setting/store-setting.schema"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

const SELLER_DETAILS_COLUMNS = {
  city: storeSetting.sellerCity,
  countryCode: storeSetting.sellerCountryCode,
  email: storeSetting.sellerEmail,
  legalName: storeSetting.sellerLegalName,
  nip: storeSetting.sellerNip,
  phone: storeSetting.sellerPhone,
  postalCode: storeSetting.sellerPostalCode,
  regon: storeSetting.sellerRegon,
  street: storeSetting.sellerStreet,
  updatedAt: storeSetting.sellerUpdatedAt,
}

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

export const findFreeDeliveryThreshold = async (): Promise<number | undefined> => {
  const [row] = await db
    .select({ freeDeliveryThreshold: storeSetting.freeDeliveryThreshold })
    .from(storeSetting)
    .where(eq(storeSetting.id, STORE_SETTING_ID))
    .limit(1)

  return row?.freeDeliveryThreshold ?? undefined
}

export const saveFreeDeliveryThreshold = async (threshold: number | undefined): Promise<void> => {
  const freeDeliveryThreshold = threshold ?? sql`NULL`
  await db
    .insert(storeSetting)
    .values({ freeDeliveryThreshold, id: STORE_SETTING_ID })
    .onConflictDoUpdate({ set: { freeDeliveryThreshold }, target: storeSetting.id })
}

export const readSellerDetails = async (): Promise<StoreSetting["storedSellerDetails"]> => {
  const [row] = await db.select(SELLER_DETAILS_COLUMNS).from(storeSetting).where(eq(storeSetting.id, STORE_SETTING_ID)).limit(1)
  if (row === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  return row
}

export const saveSellerDetailsIfUnchanged = async ({
  details,
  expectedUpdatedAt,
}: Readonly<{ details: StoreSetting["sellerDetails"]; expectedUpdatedAt: Date }>): Promise<
  StoreSetting["storedSellerDetails"] | undefined
> => {
  const [row] = await db
    .update(storeSetting)
    .set({
      sellerCity: details.city,
      sellerCountryCode: details.countryCode,
      sellerEmail: details.email,
      sellerLegalName: details.legalName,
      sellerNip: details.nip,
      sellerPhone: details.phone,
      sellerPostalCode: details.postalCode,
      sellerRegon: details.regon,
      sellerStreet: details.street,
      sellerUpdatedAt: new Date(),
    })
    .where(and(eq(storeSetting.id, STORE_SETTING_ID), eq(storeSetting.sellerUpdatedAt, expectedUpdatedAt)))
    .returning(SELLER_DETAILS_COLUMNS)

  return row
}
