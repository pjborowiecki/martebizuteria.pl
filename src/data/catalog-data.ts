export interface ProductRecord {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly collection: string
  readonly price: string
  readonly stock: number
  readonly status: "active" | "low" | "draft"
  readonly image: string
}

export const PRODUCTS: readonly ProductRecord[] = [
  {
    category: "Earrings",
    collection: "Nova",
    id: "MR-001",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80",
    name: "Aura Hoop I",
    price: "$340",
    status: "active",
    stock: 24,
  },
  {
    category: "Earrings",
    collection: "Celestial",
    id: "MR-002",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80",
    name: "Lune Drop",
    price: "$420",
    status: "active",
    stock: 18,
  },
  {
    category: "Bracelets",
    collection: "Nova",
    id: "MR-003",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=200&q=80",
    name: "Arc Cuff",
    price: "$520",
    status: "low",
    stock: 7,
  },
  {
    category: "Rings",
    collection: "Iconic",
    id: "MR-004",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=200&q=80",
    name: "Forma II Ring",
    price: "$480",
    status: "active",
    stock: 31,
  },
  {
    category: "Necklaces",
    collection: "Celestial",
    id: "MR-005",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=200&q=80",
    name: "Seda Chain",
    price: "$680",
    status: "active",
    stock: 12,
  },
  {
    category: "Necklaces",
    collection: "Bridal",
    id: "MR-006",
    image: "https://images.unsplash.com/photo-1515562141589-67f0d569b46e?auto=format&fit=crop&w=200&q=80",
    name: "Vela Pendant",
    price: "$890",
    status: "draft",
    stock: 0,
  },
  {
    category: "Rings",
    collection: "Nova",
    id: "MR-007",
    image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=200&q=80",
    name: "Orion Band",
    price: "$360",
    status: "active",
    stock: 15,
  },
  {
    category: "Earrings",
    collection: "Celestial",
    id: "MR-008",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80",
    name: "Eclipse Ear Cuff",
    price: "$280",
    status: "low",
    stock: 4,
  },
]

export interface SparkPoint {
  readonly v: number
}

export interface ProductStatRecord {
  readonly key: string
  readonly trend: string
  readonly up: boolean
  readonly color: string
  readonly spark: readonly SparkPoint[]
}

export const PRODUCT_STATS: readonly ProductStatRecord[] = [
  {
    color: "hsl(var(--foreground))",
    key: "totalProducts",
    spark: [{ v: 210 }, { v: 218 }, { v: 225 }, { v: 222 }, { v: 230 }, { v: 238 }, { v: 241 }, { v: 248 }],
    trend: "+6.2%",
    up: true,
  },
  {
    color: "hsl(142 71% 45%)",
    key: "activeProducts",
    spark: [{ v: 186 }, { v: 192 }, { v: 198 }, { v: 195 }, { v: 202 }, { v: 208 }, { v: 212 }, { v: 216 }],
    trend: "+8.0%",
    up: true,
  },
  {
    color: "hsl(0 84% 60%)",
    key: "lowStock",
    spark: [{ v: 8 }, { v: 9 }, { v: 7 }, { v: 10 }, { v: 11 }, { v: 12 }, { v: 13 }, { v: 14 }],
    trend: "+16.7%",
    up: false,
  },
  {
    color: "hsl(var(--muted-foreground))",
    key: "draftProducts",
    spark: [{ v: 24 }, { v: 22 }, { v: 21 }, { v: 20 }, { v: 22 }, { v: 19 }, { v: 18 }, { v: 18 }],
    trend: "-10.0%",
    up: true,
  },
]

export interface StatusInfo {
  readonly variant: "default" | "secondary" | "outline" | "destructive"
  readonly label: string
}

export const STATUS_MAP: Record<string, StatusInfo> = {
  active: { label: "Active", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  low: { label: "Low Stock", variant: "outline" },
}

export const CATEGORIES: readonly string[] = ["Earrings", "Necklaces", "Rings", "Bracelets", "Brooches"]
export const COLLECTIONS: readonly string[] = ["Nova", "Celestial", "Iconic", "Bridal", "Heritage"]
export const MATERIALS: readonly string[] = ["18K Gold", "Sterling Silver", "Platinum", "Rose Gold", "White Gold"]

export interface ProductVariant {
  readonly id: number
  readonly name: string
  readonly price: string
  readonly stock: string
}
