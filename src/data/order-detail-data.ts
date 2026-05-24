/**
 * Static demo data for the Order Detail page.
 * All orders display the MR-9241 demo data. Will be replaced with API calls.
 */

import {
  type LucideIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MailX,
  MessageSquare,
  Package,
  ShoppingBag,
  Truck,
  XCircle
} from "lucide-react";

/** Demo order (matches MR-9241 in the admin UI). */
export const DEMO_ORDER = {
  channel: "Online Store",
  currency: "USD",
  date: "Oct 24, 2023",
  id: "MR-9241",
  ip: "82.132.xxx.xxx",
  locale: "en-US",
  notes: "Customer requested gift wrapping and a handwritten note. Prefers DHL Express.",
  payment: "paid",
  paymentMethod: "Visa •••• 4242",
  status: "shipped",
  tags: ["Gift Order", "Express Shipping", "VIP"],
  time: "14:32 CET",
  transactionId: "txn_3Ns8wK2eZvKY"
} as const;

export const DEMO_CUSTOMER = {
  email: "eleanor@marte.co",
  id: "cust-9241",
  initials: "EH",
  name: "Eleanor H. Sterling",
  number: "CUST-9241",
  orders: 12,
  phone: "+44 20 7946 0958",
  tier: "VIP"
} as const;

export const DEMO_SHIPPING = {
  city: "London",
  country: "United Kingdom",
  estimatedDelivery: "Oct 27, 2023",
  line1: "12 Kensington Court",
  line2: "Flat 4B",
  method: "DHL Express",
  name: "Eleanor H. Sterling",
  postcode: "W8 5DL",
  tracking: "1Z999AA10123456784"
} as const;

export const DEMO_BILLING = {
  city: "London",
  country: "United Kingdom",
  line1: "12 Kensington Court",
  line2: "Flat 4B",
  name: "Eleanor H. Sterling",
  postcode: "W8 5DL"
} as const;

export interface LineItem {
  readonly name: string;
  readonly price: string;
  readonly qty: number;
  readonly sku: string;
  readonly total: string;
  readonly variant: string;
}

export const DEMO_LINE_ITEMS: readonly LineItem[] = [
  { name: "Aura Hoop I", price: "$1,850.00", qty: 1, sku: "AUR-HP-001-GD", total: "$1,850.00", variant: "18k Gold / Medium" },
  { name: "Lune Drop Earrings", price: "$1,200.00", qty: 1, sku: "LUN-DR-002-SV", total: "$1,200.00", variant: "Sterling Silver" },
  { name: "Eclipse Ear Cuff", price: "$1,200.00", qty: 1, sku: "ECL-EC-001-GD", total: "$1,200.00", variant: "18k Gold" }
];

export const DEMO_SUMMARY = {
  discount: "-$0.00",
  discountCode: undefined,
  shipping: "$0.00",
  shippingLabel: "DHL Express (complimentary)",
  subtotal: "$4,250.00",
  tax: "$0.00",
  taxLabel: "VAT (0% — Export)",
  total: "$4,250.00"
} as const;

export interface FulfillmentStep {
  readonly date: string | undefined;
  readonly done: boolean;
  readonly key: string;
}

export const DEMO_FULFILLMENT_STEPS: readonly FulfillmentStep[] = [
  { date: "Oct 24, 14:32", done: true, key: "confirmed" },
  { date: "Oct 24, 15:10", done: true, key: "processing" },
  { date: "Oct 25, 09:45", done: true, key: "shipped" },
  { date: undefined, done: false, key: "outForDelivery" },
  { date: undefined, done: false, key: "delivered" }
];

export interface TimelineEvent {
  readonly date: string;
  readonly description: string;
  readonly status: string | undefined;
  readonly type: string;
}

export const DEMO_TIMELINE: readonly TimelineEvent[] = [
  { date: "Oct 25, 09:46", description: "Dispatch confirmation email sent to eleanor@marte.co", status: "delivered", type: "email" },
  {
    date: "Oct 25, 09:45",
    description: "Package shipped via DHL Express — tracking 1Z999AA10123456784",
    status: undefined,
    type: "shipping"
  },
  { date: "Oct 24, 15:11", description: "Fulfillment started email sent to eleanor@marte.co", status: "delivered", type: "email" },
  { date: "Oct 24, 15:10", description: "Order picked and packed — fulfillment started", status: undefined, type: "fulfillment" },
  { date: "Oct 24, 14:34", description: "Payment receipt email sent to eleanor@marte.co", status: "delivered", type: "email" },
  { date: "Oct 24, 14:33", description: "Payment of $4,250.00 captured (Visa •••• 4242)", status: undefined, type: "payment" },
  { date: "Oct 24, 14:33", description: "Order confirmation email sent to eleanor@marte.co", status: "delivered", type: "email" },
  { date: "Oct 24, 14:32", description: "Order MR-9241 placed by Eleanor H. Sterling", status: undefined, type: "order" },
  { date: "Oct 24, 14:32", description: "Customer note: Gift wrapping requested with handwritten note", status: undefined, type: "note" }
];

export const ORDER_STATUS_STYLES: Record<string, string> = {
  cancelled: "bg-red-500/10 text-red-500",
  delivered: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  returned: "bg-red-500/10 text-red-500",
  shipped: "bg-blue-500/10 text-blue-600",
  unfulfilled: "bg-muted-foreground/10 text-muted-foreground"
};

export const ORDER_PAYMENT_STYLES: Record<string, string> = {
  authorized: "bg-amber-500/10 text-amber-600",
  paid: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  refunded: "bg-red-500/10 text-red-500"
};

export const TIMELINE_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  fulfillment: Package,
  note: MessageSquare,
  order: ShoppingBag,
  payment: CreditCard,
  shipping: Truck
};

export interface EmailStatusConfig {
  readonly className: string;
  readonly icon: LucideIcon;
}

export const EMAIL_STATUS_CONFIG: Record<string, EmailStatusConfig> = {
  bounced: { className: "text-red-500", icon: MailX },
  deferred: { className: "text-amber-500", icon: AlertTriangle },
  delivered: { className: "text-emerald-500", icon: CheckCircle2 },
  failed: { className: "text-red-500", icon: XCircle }
};

export const TIMELINE_DEFAULT_ICON = Clock;

/** Description slice length for generating unique keys */
export const TIMELINE_KEY_SLICE_START = 0;
export const TIMELINE_KEY_SLICE_LENGTH = 20;
