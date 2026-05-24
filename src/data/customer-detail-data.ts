import { Mail, MessageSquare, type Package, ShoppingBag, Star } from "lucide-react";

export const CUSTOMER = {
  address: "12 Kensington Court, London W8 5DL, United Kingdom",
  avgOrder: "$2,850",
  email: "eleanor@marte.co",
  id: "CUST-9241",
  initials: "EH",
  joinDate: "Mar 14, 2022",
  lastActive: "2 hours ago",
  location: "London, UK",
  name: "Eleanor H. Sterling",
  notes: "Prefers evening delivery. Interested in bespoke commissions. Has attended two private viewing events.",
  orders: 12,
  phone: "+44 20 7946 0958",
  preferredCategory: "Earrings",
  preferredCollection: "Celestial",
  returningRate: "92%",
  spent: "$34,200",
  tags: ["VIP", "Repeat Buyer", "Event Guest", "Bespoke Interest"],
  tier: "VIP"
};

export const SPENDING_DATA = [
  { amount: 0, month: "Jan" },
  { amount: 2400, month: "Feb" },
  { amount: 0, month: "Mar" },
  { amount: 4800, month: "Apr" },
  { amount: 3200, month: "May" },
  { amount: 0, month: "Jun" },
  { amount: 6400, month: "Jul" },
  { amount: 2800, month: "Aug" },
  { amount: 5200, month: "Sep" },
  { amount: 4600, month: "Oct" },
  { amount: 2400, month: "Nov" },
  { amount: 2400, month: "Dec" }
];

export const CATEGORY_BREAKDOWN = [
  { amount: 14_200, category: "Earrings" },
  { amount: 8600, category: "Necklaces" },
  { amount: 6400, category: "Rings" },
  { amount: 5000, category: "Bracelets" }
];

export const ORDERS = [
  {
    date: "Oct 24, 2023",
    id: "MR-9241",
    items: ["Aura Hoop I", "Lune Drop Earrings"],
    payment: "paid",
    status: "delivered",
    total: "$4,250.00"
  },
  {
    date: "Sep 12, 2023",
    id: "MR-8874",
    items: ["Celestial Pendant"],
    payment: "paid",
    status: "delivered",
    total: "$2,800.00"
  },
  {
    date: "Aug 3, 2023",
    id: "MR-8510",
    items: ["Nova Ring", "Arc Cuff"],
    payment: "paid",
    status: "delivered",
    total: "$5,200.00"
  },
  {
    date: "Jul 18, 2023",
    id: "MR-8102",
    items: ["Forma II Ring", "Seda Chain", "Eclipse Ear Cuff"],
    payment: "paid",
    status: "delivered",
    total: "$6,400.00"
  },
  {
    date: "May 9, 2023",
    id: "MR-7645",
    items: ["Vela Pendant"],
    payment: "paid",
    status: "delivered",
    total: "$3,200.00"
  },
  {
    date: "Apr 2, 2023",
    id: "MR-7201",
    items: ["Aura Hoop II", "Orion Band"],
    payment: "refunded",
    status: "returned",
    total: "$4,800.00"
  }
];

export const TIMELINE = [
  { date: "Oct 24, 2023", description: "Placed order MR-9241 — $4,250", type: "order" },
  {
    date: "Oct 20, 2023",
    description: "Attended private viewing event at Mayfair showroom",
    type: "note"
  },
  { date: "Oct 15, 2023", description: "Received VIP early access invitation", type: "email" },
  { date: "Sep 12, 2023", description: "Placed order MR-8874 — $2,800", type: "order" },
  { date: "Sep 1, 2023", description: "Upgraded to VIP tier", type: "tier" },
  { date: "Aug 3, 2023", description: "Placed order MR-8510 — $5,200", type: "order" },
  {
    date: "Jul 25, 2023",
    description: "Opened 'New Celestial Collection' campaign",
    type: "email"
  },
  { date: "Jul 18, 2023", description: "Placed order MR-8102 — $6,400", type: "order" }
] as const;

export const TIMELINE_ICONS: Record<string, typeof Package> = {
  email: Mail,
  note: MessageSquare,
  order: ShoppingBag,
  tier: Star
};

export const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-emerald-500/10 text-emerald-600",
  processing: "bg-amber-500/10 text-amber-600",
  returned: "bg-red-500/10 text-red-500",
  shipped: "bg-blue-500/10 text-blue-600"
};

export const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  refunded: "bg-red-500/10 text-red-500"
};
