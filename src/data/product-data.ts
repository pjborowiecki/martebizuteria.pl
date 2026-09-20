export const PRODUCT_GALLERY_MOCK = [
  "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=85",
] as const

export const PRODUCT_RELATED_MOCK = [
  {
    detailKey: "related.arcCuff.detail",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80",
    nameKey: "related.arcCuff.name",
    params: { handle: "arc-cuff" },
    priceKey: "related.arcCuff.price",
  },
  {
    detailKey: "related.silhouetteRing.detail",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    nameKey: "related.silhouetteRing.name",
    params: { handle: "silhouette-ring" },
    priceKey: "related.silhouetteRing.price",
  },
  {
    detailKey: "related.formaII.detail",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
    nameKey: "related.formaII.name",
    params: { handle: "forma-ii" },
    priceKey: "related.formaII.price",
  },
] as const

export interface ProductData {
  readonly collection?: { readonly title: string } | null
  readonly description: string | null
  readonly subtitle: string | null
  readonly thumbnail: string | null
  readonly title: string
  readonly handle: string
}
