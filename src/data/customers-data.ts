interface SparkPoint {
  v: number;
}

export const CUSTOMERS = [
  {
    email: "eleanor@marte.co",
    id: "cust-9241",
    initials: "EH",
    lastOrder: "Oct 24, 2023",
    location: "London, UK",
    name: "Eleanor H. Sterling",
    number: "CUST-9241",
    orders: 12,
    spent: "$34,200",
    tier: "VIP"
  },
  {
    email: "adrian@outlook.com",
    id: "cust-8874",
    initials: "AW",
    lastOrder: "Oct 23, 2023",
    location: "New York, US",
    name: "Adrian Wentworth",
    number: "CUST-8874",
    orders: 8,
    spent: "$22,400",
    tier: "VIP"
  },
  {
    email: "l.chen@gmail.com",
    id: "cust-8510",
    initials: "LC",
    lastOrder: "Oct 21, 2023",
    location: "Singapore",
    name: "Lydia Chen",
    number: "CUST-8510",
    orders: 5,
    spent: "$8,900",
    tier: "Gold"
  },
  {
    email: "julian.m@marte.co",
    id: "cust-8102",
    initials: "JM",
    lastOrder: "Oct 19, 2023",
    location: "Paris, FR",
    name: "Julian Morel",
    number: "CUST-8102",
    orders: 15,
    spent: "$48,200",
    tier: "VIP"
  },
  {
    email: "sofia.n@mail.jp",
    id: "cust-7645",
    initials: "SN",
    lastOrder: "Oct 18, 2023",
    location: "Tokyo, JP",
    name: "Sofia Nakamura",
    number: "CUST-7645",
    orders: 3,
    spent: "$4,200",
    tier: "Standard"
  },
  {
    email: "m.vdberg@proton.me",
    id: "cust-7201",
    initials: "MV",
    lastOrder: "Oct 17, 2023",
    location: "Amsterdam, NL",
    name: "Magnus Van Der Berg",
    number: "CUST-7201",
    orders: 6,
    spent: "$11,340",
    tier: "Gold"
  },
  {
    email: "c.dubois@icloud.com",
    id: "cust-6820",
    initials: "CD",
    lastOrder: "Oct 15, 2023",
    location: "Monaco",
    name: "Celeste Dubois",
    number: "CUST-6820",
    orders: 22,
    spent: "$76,800",
    tier: "VIP"
  },
  {
    email: "tomas.r@gmail.com",
    id: "cust-6400",
    initials: "TR",
    lastOrder: "Oct 14, 2023",
    location: "Madrid, ES",
    name: "Tomas Rivera",
    number: "CUST-6400",
    orders: 2,
    spent: "$1,260",
    tier: "Standard"
  },
  {
    email: "i.fontaine@yahoo.fr",
    id: "cust-6180",
    initials: "IF",
    lastOrder: "Oct 10, 2023",
    location: "Lyon, FR",
    name: "Isabella Fontaine",
    number: "CUST-6180",
    orders: 9,
    spent: "$18,400",
    tier: "Gold"
  },
  {
    email: "h.lindstrom@gmail.com",
    id: "cust-5945",
    initials: "HL",
    lastOrder: "Oct 8, 2023",
    location: "Stockholm, SE",
    name: "Henrik Lindström",
    number: "CUST-5945",
    orders: 4,
    spent: "$6,800",
    tier: "Standard"
  },
  {
    email: "amelie.r@proton.me",
    id: "cust-5720",
    initials: "AR",
    lastOrder: "Oct 5, 2023",
    location: "Geneva, CH",
    name: "Amélie Renard",
    number: "CUST-5720",
    orders: 18,
    spent: "$62,100",
    tier: "VIP"
  },
  {
    email: "n.petrov@mail.ru",
    id: "cust-5510",
    initials: "NP",
    lastOrder: "Sep 28, 2023",
    location: "Berlin, DE",
    name: "Nikolai Petrov",
    number: "CUST-5510",
    orders: 7,
    spent: "$14,800",
    tier: "Gold"
  },
  {
    email: "v.harding@icloud.com",
    id: "cust-5280",
    initials: "VH",
    lastOrder: "Sep 22, 2023",
    location: "Sydney, AU",
    name: "Victoria Harding",
    number: "CUST-5280",
    orders: 11,
    spent: "$28,900",
    tier: "VIP"
  },
  {
    email: "marco.dl@gmail.com",
    id: "cust-5040",
    initials: "MD",
    lastOrder: "Sep 18, 2023",
    location: "Milan, IT",
    name: "Marco De Luca",
    number: "CUST-5040",
    orders: 3,
    spent: "$5,400",
    tier: "Standard"
  },
  {
    email: "y.tanaka@outlook.jp",
    id: "cust-4815",
    initials: "YT",
    lastOrder: "Sep 12, 2023",
    location: "Osaka, JP",
    name: "Yuki Tanaka",
    number: "CUST-4815",
    orders: 6,
    spent: "$10,200",
    tier: "Gold"
  },
  {
    email: "c.beaumont@gmail.com",
    id: "cust-4590",
    initials: "CB",
    lastOrder: "Sep 8, 2023",
    location: "Brussels, BE",
    name: "Camille Beaumont",
    number: "CUST-4590",
    orders: 14,
    spent: "$41,600",
    tier: "VIP"
  },
  {
    email: "a.cross@proton.me",
    id: "cust-4360",
    initials: "AC",
    lastOrder: "Sep 4, 2023",
    location: "Toronto, CA",
    name: "Alexander Cross",
    number: "CUST-4360",
    orders: 5,
    spent: "$9,700",
    tier: "Gold"
  },
  {
    email: "e.vasquez@gmail.com",
    id: "cust-4120",
    initials: "EV",
    lastOrder: "Aug 30, 2023",
    location: "Barcelona, ES",
    name: "Elena Vasquez",
    number: "CUST-4120",
    orders: 2,
    spent: "$3,200",
    tier: "Standard"
  },
  {
    email: "s.kraft@mail.de",
    id: "cust-3880",
    initials: "SK",
    lastOrder: "Aug 25, 2023",
    location: "Munich, DE",
    name: "Sebastian Kraft",
    number: "CUST-3880",
    orders: 8,
    spent: "$19,500",
    tier: "Gold"
  }
] as const;

export type Customer = (typeof CUSTOMERS)[number];

export const CUSTOMER_STATS = [
  {
    color: "hsl(var(--foreground))",
    key: "totalCustomers",
    spark: [{ v: 2400 }, { v: 2480 }, { v: 2560 }, { v: 2620 }, { v: 2680 }, { v: 2740 }, { v: 2790 }, { v: 2847 }],
    trend: "+4.1%",
    up: true
  },
  {
    color: "hsl(38 92% 50%)",
    key: "vipCustomers",
    spark: [{ v: 94 }, { v: 98 }, { v: 102 }, { v: 106 }, { v: 110 }, { v: 115 }, { v: 120 }, { v: 124 }],
    trend: "+9.7%",
    up: true
  },
  {
    color: "hsl(142 71% 45%)",
    key: "averageLTV",
    spark: [{ v: 3600 }, { v: 3720 }, { v: 3840 }, { v: 3920 }, { v: 4020 }, { v: 4100 }, { v: 4200 }, { v: 4280 }],
    trend: "+6.3%",
    up: true
  },
  {
    color: "hsl(221 83% 53%)",
    key: "returningRate",
    spark: [{ v: 58 }, { v: 60 }, { v: 62 }, { v: 63 }, { v: 64 }, { v: 66 }, { v: 67 }, { v: 68 }],
    trend: "+2.4%",
    up: true
  }
] satisfies readonly {
  readonly color: string;
  readonly key: string;
  readonly spark: SparkPoint[];
  readonly trend: string;
  readonly up: boolean;
}[];

export type CustomerStat = (typeof CUSTOMER_STATS)[number];
