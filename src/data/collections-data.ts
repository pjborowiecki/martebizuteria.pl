export interface CollectionItem {
  readonly id: number
  readonly name: string
  readonly slug: string
  readonly products: number
  readonly description: string
  readonly status: "active" | "draft"
  readonly image: string
}

export const COLLECTIONS: readonly CollectionItem[] = [
  {
    description: "Minimalist, architectural pieces defined by clean geometry",
    id: 1,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80",
    name: "Nova",
    products: 18,
    slug: "nova",
    status: "active",
  },
  {
    description: "Inspired by the night sky — stars, moons, and cosmic motifs",
    id: 2,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80",
    name: "Celestial",
    products: 24,
    slug: "celestial",
    status: "active",
  },
  {
    description: "Signature bold statements and heritage silhouettes",
    id: 3,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=200&q=80",
    name: "Iconic",
    products: 12,
    slug: "iconic",
    status: "active",
  },
  {
    description: "Timeless elegance for engagement, wedding, and ceremony",
    id: 4,
    image: "https://images.unsplash.com/photo-1515562141589-67f0d569b46e?auto=format&fit=crop&w=200&q=80",
    name: "Bridal",
    products: 15,
    slug: "bridal",
    status: "active",
  },
  {
    description: "Artisan-crafted pieces drawing from traditional techniques",
    id: 5,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=200&q=80",
    name: "Heritage",
    products: 6,
    slug: "heritage",
    status: "draft",
  },
]

export const MOCK_COLLECTIONS: Record<
  string,
  {
    readonly name: string
    readonly slug: string
    readonly description: string
    readonly status: "active" | "draft"
    readonly products: number
    readonly created: string
    readonly updated: string
    readonly image: string
    readonly metaTitle: string
    readonly metaDescription: string
    readonly featured: boolean
  }
> = {
  "1": {
    created: "Aug 12, 2022",
    description:
      "Minimalist, architectural pieces defined by clean geometry. The Nova collection features bold lines, negative space, and a refined palette of gold and platinum. Each piece is designed to make a quiet but powerful statement.",
    featured: true,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    metaDescription: "Explore the Nova collection — minimalist, architectural jewellery.",
    metaTitle: "Nova Collection | Marte",
    name: "Nova",
    products: 18,
    slug: "nova",
    status: "active",
    updated: "Oct 24, 2023",
  },
  "2": {
    created: "Aug 12, 2022",
    description:
      "Inspired by the night sky — stars, moons, and cosmic motifs rendered in precious metals and gemstones. The Celestial collection captures the wonder of the universe in wearable art.",
    featured: true,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80",
    metaDescription: "Discover celestial-inspired luxury jewellery from Marte.",
    metaTitle: "Celestial Collection | Marte",
    name: "Celestial",
    products: 24,
    slug: "celestial",
    status: "active",
    updated: "Oct 22, 2023",
  },
  "3": {
    created: "Sep 1, 2022",
    description:
      "Signature bold statements and heritage silhouettes. The Iconic collection draws from decades of design language, reimagined for the modern wearer.",
    featured: false,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
    metaDescription: "Shop the Iconic collection of bold luxury jewellery.",
    metaTitle: "Iconic Collection | Marte",
    name: "Iconic",
    products: 12,
    slug: "iconic",
    status: "active",
    updated: "Oct 18, 2023",
  },
  "4": {
    created: "Sep 15, 2022",
    description: "Timeless elegance for engagement, wedding, and ceremony. Handcrafted with the finest diamonds and precious metals.",
    featured: true,
    image: "https://images.unsplash.com/photo-1515562141589-67f0d569b46e?auto=format&fit=crop&w=800&q=80",
    metaDescription: "Discover bridal jewellery for your special day.",
    metaTitle: "Bridal Collection | Marte",
    name: "Bridal",
    products: 15,
    slug: "bridal",
    status: "active",
    updated: "Oct 15, 2023",
  },
  "5": {
    created: "Mar 5, 2023",
    description: "Artisan-crafted pieces drawing from traditional techniques passed down through generations of master goldsmiths.",
    featured: false,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
    metaDescription: "",
    metaTitle: "",
    name: "Heritage",
    products: 6,
    slug: "heritage",
    status: "draft",
    updated: "Oct 10, 2023",
  },
}

export const PREBUILT_COLLECTION_ROUTE_IDS: readonly string[] = ["new", "1", "2", "3", "4", "5"]
