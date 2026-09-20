export interface OrderRecord {
  readonly customer: string
  readonly customerId: string
  readonly date: string
  readonly email: string
  readonly fulfillment: string
  readonly id: string
  readonly initials: string
  readonly items: number
  readonly payment: string
  readonly total: string
}

export const ORDER_TABS = ["all", "pending", "unfulfilled", "shipped", "delivered"] as const
export type OrderTab = (typeof ORDER_TABS)[number]

export interface OrderStatSparkPoint {
  readonly v: number
}

export interface OrderStat {
  readonly color: string
  readonly key: string
  readonly spark: readonly OrderStatSparkPoint[]
  readonly trend: string
  readonly up: boolean
}

export const ORDER_STATS: readonly OrderStat[] = [
  {
    color: "hsl(var(--foreground))",
    key: "totalOrders",
    spark: [{ v: 980 }, { v: 1020 }, { v: 1060 }, { v: 1100 }, { v: 1150 }, { v: 1200 }, { v: 1240 }, { v: 1284 }],
    trend: "+8.2%",
    up: true,
  },
  {
    color: "hsl(38 92% 50%)",
    key: "pending",
    spark: [{ v: 34 }, { v: 30 }, { v: 28 }, { v: 32 }, { v: 26 }, { v: 25 }, { v: 24 }, { v: 23 }],
    trend: "-12.0%",
    up: true,
  },
  {
    color: "hsl(142 71% 45%)",
    key: "revenue",
    spark: [{ v: 98_000 }, { v: 105_000 }, { v: 112_000 }, { v: 118_000 }, { v: 126_000 }, { v: 132_000 }, { v: 138_000 }, { v: 142_850 }],
    trend: "+12.5%",
    up: true,
  },
  {
    color: "hsl(221 83% 53%)",
    key: "avgValue",
    spark: [{ v: 2520 }, { v: 2580 }, { v: 2640 }, { v: 2700 }, { v: 2740 }, { v: 2780 }, { v: 2810 }, { v: 2845 }],
    trend: "+4.1%",
    up: true,
  },
]

export interface PaymentStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}

export const PAYMENT_BADGE_STYLES: Record<string, PaymentStyle> = {
  authorized: { variant: "outline" },
  paid: { className: "bg-emerald-600 hover:bg-emerald-700", variant: "default" },
  refunded: { variant: "destructive" },
}

export const FULFILLMENT_DOT_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500",
  pending: "bg-amber-500",
  returned: "bg-red-400",
  shipped: "bg-blue-500",
  unfulfilled: "bg-muted-foreground/30",
}

export const ORDERS: readonly OrderRecord[] = [
  {
    customer: "Eleanor H. Sterling",
    customerId: "CUST-9241",
    date: "Oct 24, 2023",
    email: "eleanor@marte.co",
    fulfillment: "unfulfilled",
    id: "MR-9241",
    initials: "EH",
    items: 3,
    payment: "paid",
    total: "$4,250.00",
  },
  {
    customer: "Adrian Wentworth",
    customerId: "CUST-8874",
    date: "Oct 23, 2023",
    email: "adrian@outlook.com",
    fulfillment: "shipped",
    id: "MR-9238",
    initials: "AW",
    items: 1,
    payment: "paid",
    total: "$12,800.00",
  },
  {
    customer: "Lydia Chen",
    customerId: "CUST-8510",
    date: "Oct 21, 2023",
    email: "l.chen@gmail.com",
    fulfillment: "pending",
    id: "MR-9235",
    initials: "LC",
    items: 2,
    payment: "authorized",
    total: "$1,150.00",
  },
  {
    customer: "Julian Morel",
    customerId: "CUST-8102",
    date: "Oct 19, 2023",
    email: "julian.m@marte.co",
    fulfillment: "delivered",
    id: "MR-9230",
    initials: "JM",
    items: 5,
    payment: "paid",
    total: "$7,400.00",
  },
  {
    customer: "Sofia Nakamura",
    customerId: "CUST-7645",
    date: "Oct 18, 2023",
    email: "sofia.n@mail.jp",
    fulfillment: "shipped",
    id: "MR-9228",
    initials: "SN",
    items: 2,
    payment: "paid",
    total: "$3,600.00",
  },
  {
    customer: "Magnus Van Der Berg",
    customerId: "CUST-7201",
    date: "Oct 17, 2023",
    email: "m.vdberg@proton.me",
    fulfillment: "returned",
    id: "MR-9224",
    initials: "MV",
    items: 1,
    payment: "refunded",
    total: "$840.00",
  },
  {
    customer: "Celeste Dubois",
    customerId: "CUST-6820",
    date: "Oct 15, 2023",
    email: "c.dubois@icloud.com",
    fulfillment: "delivered",
    id: "MR-9220",
    initials: "CD",
    items: 3,
    payment: "paid",
    total: "$5,280.00",
  },
  {
    customer: "Tomas Rivera",
    customerId: "CUST-6400",
    date: "Oct 14, 2023",
    email: "tomas.r@gmail.com",
    fulfillment: "delivered",
    id: "MR-9218",
    initials: "TR",
    items: 1,
    payment: "paid",
    total: "$420.00",
  },
  {
    customer: "Eleanor H. Sterling",
    customerId: "CUST-9241",
    date: "Oct 12, 2023",
    email: "eleanor@marte.co",
    fulfillment: "delivered",
    id: "MR-9215",
    initials: "EH",
    items: 2,
    payment: "paid",
    total: "$2,800.00",
  },
  {
    customer: "Adrian Wentworth",
    customerId: "CUST-8874",
    date: "Oct 10, 2023",
    email: "adrian@outlook.com",
    fulfillment: "delivered",
    id: "MR-9210",
    initials: "AW",
    items: 1,
    payment: "paid",
    total: "$6,200.00",
  },
  {
    customer: "Celeste Dubois",
    customerId: "CUST-6820",
    date: "Oct 8, 2023",
    email: "c.dubois@icloud.com",
    fulfillment: "delivered",
    id: "MR-9205",
    initials: "CD",
    items: 4,
    payment: "paid",
    total: "$9,450.00",
  },
  {
    customer: "Julian Morel",
    customerId: "CUST-8102",
    date: "Oct 6, 2023",
    email: "julian.m@marte.co",
    fulfillment: "delivered",
    id: "MR-9198",
    initials: "JM",
    items: 2,
    payment: "paid",
    total: "$3,100.00",
  },
  {
    customer: "Sofia Nakamura",
    customerId: "CUST-7645",
    date: "Oct 4, 2023",
    email: "sofia.n@mail.jp",
    fulfillment: "shipped",
    id: "MR-9190",
    initials: "SN",
    items: 1,
    payment: "paid",
    total: "$1,950.00",
  },
  {
    customer: "Magnus Van Der Berg",
    customerId: "CUST-7201",
    date: "Oct 2, 2023",
    email: "m.vdberg@proton.me",
    fulfillment: "delivered",
    id: "MR-9182",
    initials: "MV",
    items: 3,
    payment: "paid",
    total: "$4,780.00",
  },
  {
    customer: "Lydia Chen",
    customerId: "CUST-8510",
    date: "Sep 29, 2023",
    email: "l.chen@gmail.com",
    fulfillment: "delivered",
    id: "MR-9175",
    initials: "LC",
    items: 1,
    payment: "paid",
    total: "$2,400.00",
  },
  {
    customer: "Celeste Dubois",
    customerId: "CUST-6820",
    date: "Sep 27, 2023",
    email: "c.dubois@icloud.com",
    fulfillment: "delivered",
    id: "MR-9168",
    initials: "CD",
    items: 2,
    payment: "paid",
    total: "$7,200.00",
  },
  {
    customer: "Eleanor H. Sterling",
    customerId: "CUST-9241",
    date: "Sep 24, 2023",
    email: "eleanor@marte.co",
    fulfillment: "delivered",
    id: "MR-9160",
    initials: "EH",
    items: 1,
    payment: "paid",
    total: "$3,650.00",
  },
  {
    customer: "Julian Morel",
    customerId: "CUST-8102",
    date: "Sep 20, 2023",
    email: "julian.m@marte.co",
    fulfillment: "delivered",
    id: "MR-9152",
    initials: "JM",
    items: 3,
    payment: "paid",
    total: "$5,900.00",
  },
  {
    customer: "Tomas Rivera",
    customerId: "CUST-6400",
    date: "Sep 18, 2023",
    email: "tomas.r@gmail.com",
    fulfillment: "delivered",
    id: "MR-9145",
    initials: "TR",
    items: 1,
    payment: "paid",
    total: "$840.00",
  },
  {
    customer: "Adrian Wentworth",
    customerId: "CUST-8874",
    date: "Sep 15, 2023",
    email: "adrian@outlook.com",
    fulfillment: "delivered",
    id: "MR-9138",
    initials: "AW",
    items: 2,
    payment: "paid",
    total: "$4,100.00",
  },
]

export const SPARKLINE_WIDTH = 96
export const SPARKLINE_HEIGHT = 48
export const SPARKLINE_STROKE_WIDTH = 1.5
