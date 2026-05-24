export interface CategoryItem {
  readonly description: string;
  readonly id: number;
  readonly name: string;
  readonly products: number;
  readonly slug: string;
  readonly status: "active" | "draft";
}

export const CATEGORIES: readonly CategoryItem[] = [
  {
    description: "Statement and everyday earrings, from studs to chandeliers",
    id: 1,
    name: "Earrings",
    products: 34,
    slug: "earrings",
    status: "active"
  },
  {
    description: "Chains, pendants, and layering pieces crafted in precious metals",
    id: 2,
    name: "Necklaces",
    products: 28,
    slug: "necklaces",
    status: "active"
  },
  {
    description: "Bands, signet rings, and statement pieces for every occasion",
    id: 3,
    name: "Rings",
    products: 22,
    slug: "rings",
    status: "active"
  },
  {
    description: "Cuffs, bangles, and delicate chain bracelets",
    id: 4,
    name: "Bracelets",
    products: 16,
    slug: "bracelets",
    status: "active"
  },
  {
    description: "Decorative pins and brooches with artisan detail",
    id: 5,
    name: "Brooches",
    products: 8,
    slug: "brooches",
    status: "draft"
  },
  {
    description: "Fine chain anklets for summer styling",
    id: 6,
    name: "Anklets",
    products: 0,
    slug: "anklets",
    status: "draft"
  }
];

export const CATEGORY_STATS = [
  {
    color: "hsl(var(--foreground))",
    key: "total",
    spark: [{ v: 4 }, { v: 4 }, { v: 5 }, { v: 5 }, { v: 5 }, { v: 6 }, { v: 6 }, { v: 6 }],
    trend: "+1",
    up: true
  },
  {
    color: "hsl(142 71% 45%)",
    key: "active",
    spark: [{ v: 3 }, { v: 3 }, { v: 3 }, { v: 3 }, { v: 4 }, { v: 4 }, { v: 4 }, { v: 4 }],
    trend: "+1",
    up: true
  },
  {
    color: "hsl(var(--muted-foreground))",
    key: "draft",
    spark: [{ v: 1 }, { v: 1 }, { v: 2 }, { v: 2 }, { v: 1 }, { v: 2 }, { v: 2 }, { v: 2 }],
    trend: "0",
    up: true
  },
  {
    color: "hsl(221 83% 53%)",
    key: "avgProducts",
    spark: [{ v: 35 }, { v: 36 }, { v: 37 }, { v: 38 }, { v: 39 }, { v: 40 }, { v: 40 }, { v: 41 }],
    trend: "+3.2%",
    up: true
  }
] as const;

export const MOCK_CATEGORIES: Record<
  string,
  {
    readonly name: string;
    readonly slug: string;
    readonly description: string;
    readonly status: "active" | "draft";
    readonly products: number;
    readonly created: string;
    readonly updated: string;
    readonly metaTitle: string;
    readonly metaDescription: string;
    readonly featured: boolean;
    readonly parent: string;
    readonly image: string;
  }
> = {
  "1": {
    created: "Aug 12, 2022",
    description:
      "Statement and everyday earrings, from studs to chandeliers. Our curated selection features pieces crafted in 18k gold, platinum, and sterling silver, set with ethically sourced diamonds, sapphires, and pearls.",
    featured: true,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
    metaDescription: "Discover our collection of handcrafted luxury earrings.",
    metaTitle: "Luxury Earrings | Marte",
    name: "Earrings",
    parent: "",
    products: 34,
    slug: "earrings",
    status: "active",
    updated: "Oct 24, 2023"
  },
  "2": {
    created: "Aug 12, 2022",
    description:
      "Chains, pendants, and layering pieces crafted in precious metals. From minimalist everyday chains to statement diamond pendants.",
    featured: true,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80",
    metaDescription: "Explore exquisite necklaces and pendants from Marte.",
    metaTitle: "Luxury Necklaces | Marte",
    name: "Necklaces",
    parent: "",
    products: 28,
    slug: "necklaces",
    status: "active",
    updated: "Oct 20, 2023"
  },
  "3": {
    created: "Aug 12, 2022",
    description: "Bands, signet rings, and statement pieces for every occasion.",
    featured: true,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80",
    metaDescription: "Find your perfect ring from our curated collection.",
    metaTitle: "Luxury Rings | Marte",
    name: "Rings",
    parent: "",
    products: 22,
    slug: "rings",
    status: "active",
    updated: "Oct 18, 2023"
  },
  "4": {
    created: "Sep 5, 2022",
    description: "Cuffs, bangles, and delicate chain bracelets crafted with exceptional attention to detail.",
    featured: false,
    image: "",
    metaDescription: "Shop handcrafted bracelets and bangles.",
    metaTitle: "Luxury Bracelets | Marte",
    name: "Bracelets",
    parent: "",
    products: 16,
    slug: "bracelets",
    status: "active",
    updated: "Oct 15, 2023"
  },
  "5": {
    created: "Jan 10, 2023",
    description: "Decorative pins and brooches with artisan detail.",
    featured: false,
    image: "",
    metaDescription: "",
    metaTitle: "",
    name: "Brooches",
    parent: "",
    products: 8,
    slug: "brooches",
    status: "draft",
    updated: "Oct 10, 2023"
  },
  "6": {
    created: "Oct 1, 2023",
    description: "Fine chain anklets for summer styling.",
    featured: false,
    image: "",
    metaDescription: "",
    metaTitle: "",
    name: "Anklets",
    parent: "",
    products: 0,
    slug: "anklets",
    status: "draft",
    updated: "Oct 1, 2023"
  }
};

export const PARENT_CATEGORIES = ["Jewellery", "Accessories", "Gifts"] as const;

export const PREBUILT_CATEGORY_ROUTE_IDS: readonly string[] = ["new", "1", "2", "3", "4", "5", "6"];
