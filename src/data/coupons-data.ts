interface SparkPoint {
  v: number
}

export const COUPONS = [
  {
    code: "WELCOME20",
    discount: "20%",
    expires: "Dec 31, 2023",
    id: "coupon-001",
    minOrder: "$100",
    status: "active",
    type: "Percentage",
    usage: "142 / 500",
  },
  {
    code: "VIP50",
    discount: "$50",
    expires: "Nov 30, 2023",
    id: "coupon-002",
    minOrder: "$300",
    status: "active",
    type: "Fixed",
    usage: "28 / 50",
  },
  {
    code: "HOLIDAY15",
    discount: "15%",
    expires: "Dec 25, 2023",
    id: "coupon-003",
    minOrder: "—",
    status: "scheduled",
    type: "Percentage",
    usage: "0 / ∞",
  },
  {
    code: "FREESHIP",
    discount: "Free",
    expires: "—",
    id: "coupon-004",
    minOrder: "$150",
    status: "active",
    type: "Shipping",
    usage: "312 / ∞",
  },
  {
    code: "FLASH30",
    discount: "30%",
    expires: "Oct 10, 2023",
    id: "coupon-005",
    minOrder: "$200",
    status: "expired",
    type: "Percentage",
    usage: "500 / 500",
  },
  {
    code: "BRIDAL10",
    discount: "10%",
    expires: "Mar 31, 2024",
    id: "coupon-006",
    minOrder: "$500",
    status: "active",
    type: "Percentage",
    usage: "47 / 200",
  },
] as const

export type Coupon = (typeof COUPONS)[number]

export const COUPON_STATS = [
  {
    color: "hsl(var(--foreground))",
    key: "activeCoupons",
    spark: [{ v: 12 }, { v: 14 }, { v: 13 }, { v: 15 }, { v: 16 }, { v: 18 }, { v: 17 }, { v: 18 }],
    trend: "+12.5%",
    up: true,
  },
  {
    color: "hsl(38 92% 50%)",
    key: "totalRedemptions",
    spark: [{ v: 1200 }, { v: 1250 }, { v: 1300 }, { v: 1380 }, { v: 1410 }, { v: 1450 }, { v: 1470 }, { v: 1492 }],
    trend: "+8.4%",
    up: true,
  },
  {
    color: "hsl(142 71% 45%)",
    key: "revenueSaved",
    spark: [{ v: 10_000 }, { v: 10_500 }, { v: 10_200 }, { v: 11_000 }, { v: 11_500 }, { v: 11_800 }, { v: 12_100 }, { v: 12_450 }],
    trend: "+4.2%",
    up: true,
  },
  {
    color: "hsl(221 83% 53%)",
    key: "avgDiscount",
    spark: [{ v: 15 }, { v: 16 }, { v: 15 }, { v: 17 }, { v: 18 }, { v: 17 }, { v: 18 }, { v: 18 }],
    trend: "-1.5%",
    up: false,
  },
] satisfies readonly {
  readonly color: string
  readonly key: string
  readonly spark: SparkPoint[]
  readonly trend: string
  readonly up: boolean
}[]

export type CouponStat = (typeof COUPON_STATS)[number]
