import { and, eq, exists, ne, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { contentPage } from "~/src/modules/content-page/content-page.schema"
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

const sellerSavedAt = (savedAt: Date) => and(eq(storeSetting.id, STORE_SETTING_ID), eq(storeSetting.sellerUpdatedAt, savedAt))

const isSellerSavedAt = (savedAt: Date) => exists(db.select({ id: storeSetting.id }).from(storeSetting).where(sellerSavedAt(savedAt)))

const reviseLegalPage = ({ handle, locales }: Readonly<RevisedLegalPage>, savedAt: Date) =>
  db
    .update(contentPage)
    .set({
      revisedAts: sql`json_set(${contentPage.revisedAts}, ${sql.join(
        locales.map((locale) => sql`${`$."${locale}"`}, ${savedAt.getTime()}`),
        sql`, `,
      )})`,
    })
    .where(and(eq(contentPage.handle, handle), isSellerSavedAt(savedAt)))

export const saveSellerDetailsIfUnchanged = async ({
  details,
  expectedUpdatedAt,
  revisedPages,
}: Readonly<{
  details: StoreSetting["sellerDetails"]
  expectedUpdatedAt: Date
  revisedPages: readonly RevisedLegalPage[]
}>): Promise<StoreSetting["storedSellerDetails"] | undefined> => {
  const savedAt = new Date()
  const saveDetails = db
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
      sellerUpdatedAt: savedAt,
    })
    .where(and(eq(storeSetting.id, STORE_SETTING_ID), eq(storeSetting.sellerUpdatedAt, expectedUpdatedAt)))
    .returning(SELLER_DETAILS_COLUMNS)
  const [[row]] = await db.batch([saveDetails, ...revisedPages.map((page) => reviseLegalPage(page, savedAt))])

  return row
}

interface RevisedLegalPage {
  readonly handle: ContentPageHandle
  readonly locales: readonly SupportedLocale[]
}
