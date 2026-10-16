import { type z } from "zod/v4"

import { type storeSettingZodSchemas } from "~/src/modules/store-setting/store-setting.zod"

interface SellerDetails {
  readonly city: string
  readonly countryCode: string
  readonly email: string
  readonly legalName: string
  readonly nip: string
  readonly phone: string
  readonly postalCode: string
  readonly regon: string
  readonly street: string
}

export interface StoreSetting {
  sellerDetails: SellerDetails
  sellerDetailsUpdateInput: z.input<(typeof storeSettingZodSchemas)["sellerDetailsUpdateInput"]>
  sellerDetailsValues: z.output<(typeof storeSettingZodSchemas)["sellerDetails"]>
  storedSellerDetails: SellerDetails & { readonly updatedAt: Date }
}
