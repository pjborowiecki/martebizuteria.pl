import {
  DELIVERY_METHOD_ERROR,
  type DeliveryMethodError,
  type DeliveryMethodType,
  SINGLE_OFFER_DELIVERY_METHODS,
} from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

export const resolveOfferedDeliveryConflict = ({
  candidate,
  offered,
}: Readonly<{ candidate: OfferCandidate; offered: readonly OfferedMethod[] }>): DeliveryMethodError | undefined => {
  const others = offered.filter((method) => method.id !== candidate.id)
  if (candidate.isOffered) {
    return SINGLE_OFFER_DELIVERY_METHODS.has(candidate.type) && others.some((method) => method.type === candidate.type)
      ? DELIVERY_METHOD_ERROR.TYPE_ALREADY_OFFERED
      : undefined
  }

  return others.length === 0 && offered.some((method) => method.id === candidate.id) ? DELIVERY_METHOD_ERROR.LAST_OFFERED : undefined
}

interface OfferCandidate {
  readonly id: string | undefined
  readonly isOffered: boolean
  readonly type: DeliveryMethodType
}

interface OfferedMethod {
  readonly id: string
  readonly type: DeliveryMethodType
}

export const toDeliveryMethodAuditSnapshot = ({ isActive, names, price }: Readonly<DeliveryMethodAuditSource>) => ({
  availability: isActive ? "offered" : "hidden",
  nameEn: names["en-US"],
  namePl: names["pl-PL"],
  price,
})

interface DeliveryMethodAuditSource {
  readonly isActive: boolean
  readonly names: DeliveryMethod["names"]
  readonly price: number
}
