interface SparkPoint {
  v: number;
}

export const ENGAGEMENT_DATA = [
  { clickRate: 12, month: "Jan", openRate: 42 },
  { clickRate: 14, month: "Feb", openRate: 45 },
  { clickRate: 11, month: "Mar", openRate: 38 },
  { clickRate: 18, month: "Apr", openRate: 52 },
  { clickRate: 16, month: "May", openRate: 48 },
  { clickRate: 22, month: "Jun", openRate: 56 },
  { clickRate: 20, month: "Jul", openRate: 54 },
  { clickRate: 24, month: "Aug", openRate: 62 }
] as const;

export const CAMPAIGNS = [
  {
    date: "Oct 20, 2023",
    id: "camp-001",
    name: "Holiday Collection Launch",
    openRate: "62%",
    revenue: "$48,200",
    sent: "12,400",
    status: "active",
    type: "Email"
  },
  {
    date: "Oct 15, 2023",
    id: "camp-002",
    name: "VIP Early Access",
    openRate: "78%",
    revenue: "$24,600",
    sent: "2,800",
    status: "completed",
    type: "Email"
  },
  {
    date: "Oct 10, 2023",
    id: "camp-003",
    name: "Autumn Lookbook",
    openRate: "—",
    revenue: "$12,400",
    sent: "—",
    status: "active",
    type: "Social"
  },
  {
    date: "Oct 25, 2023",
    id: "camp-004",
    name: "Bridal Season Preview",
    openRate: "—",
    revenue: "—",
    sent: "—",
    status: "draft",
    type: "Email"
  },
  {
    date: "Oct 5, 2023",
    id: "camp-005",
    name: "Flash Sale Weekend",
    openRate: "54%",
    revenue: "$36,800",
    sent: "18,200",
    status: "completed",
    type: "Email"
  },
  {
    date: "Oct 1, 2023",
    id: "camp-006",
    name: "Referral Program",
    openRate: "—",
    revenue: "$8,400",
    sent: "4,200",
    status: "active",
    type: "SMS"
  }
] as const;

export type Campaign = (typeof CAMPAIGNS)[number];

export const MARKETING_STATS = [
  {
    color: "hsl(var(--foreground))",
    key: "totalCampaigns",
    spark: [{ v: 40 }, { v: 42 }, { v: 41 }, { v: 44 }, { v: 45 }, { v: 48 }, { v: 49 }, { v: 52 }],
    trend: "+8.3%",
    up: true
  },
  {
    color: "hsl(38 92% 50%)",
    key: "activeCampaigns",
    spark: [{ v: 4 }, { v: 5 }, { v: 4 }, { v: 6 }, { v: 7 }, { v: 8 }, { v: 7 }, { v: 9 }],
    trend: "+12.5%",
    up: true
  },
  {
    color: "hsl(142 71% 45%)",
    key: "totalReach",
    spark: [{ v: 120_000 }, { v: 125_000 }, { v: 132_000 }, { v: 135_000 }, { v: 142_000 }, { v: 148_000 }, { v: 152_000 }, { v: 158_000 }],
    trend: "+5.2%",
    up: true
  },
  {
    color: "hsl(221 83% 53%)",
    key: "totalRevenue",
    spark: [{ v: 84_000 }, { v: 88_000 }, { v: 86_000 }, { v: 92_000 }, { v: 95_000 }, { v: 102_000 }, { v: 108_000 }, { v: 112_000 }],
    trend: "+15.4%",
    up: true
  }
] satisfies readonly {
  readonly color: string;
  readonly key: string;
  readonly spark: SparkPoint[];
  readonly trend: string;
  readonly up: boolean;
}[];

export type MarketingStat = (typeof MARKETING_STATS)[number];
