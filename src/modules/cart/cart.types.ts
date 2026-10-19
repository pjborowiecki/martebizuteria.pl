export interface CartItem {
  readonly id: string
  readonly variantId: string
  readonly slug: string
  readonly title: string
  readonly variantTitle: string
  readonly image: string
  readonly price: string
  readonly rawPrice: number
  readonly priceChanged?: boolean
  qty: number
}

export interface CartUnitPrice {
  readonly unitPrice: number
  readonly variantId: string
}
