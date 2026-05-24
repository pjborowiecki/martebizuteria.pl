/**
 * Static mock data and type definitions for the Audit Log page.
 * Will be replaced with real API calls in production.
 */

export const AUDIT_CATEGORIES = ["all", "orders", "email", "customers", "catalog", "settings", "auth"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const SEVERITY_LEVELS = ["info", "success", "warning", "error"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export interface AuditActor {
  readonly initials: string;
  readonly name: string;
  readonly role: "admin" | "customer" | "system" | "unknown";
}

export interface AuditEvent {
  readonly action: string;
  readonly actor: AuditActor;
  readonly category: Exclude<AuditCategory, "all">;
  readonly detail: string | undefined;
  readonly id: string;
  readonly ip: string | undefined;
  readonly severity: SeverityLevel;
  readonly target: string;
  readonly timestamp: string;
}

export const SEVERITY_DOT_COLORS: Record<SeverityLevel, string> = {
  error: "bg-red-500",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500"
};

export const SEVERITY_BADGE_COLORS: Record<SeverityLevel, string> = {
  error: "bg-red-500/10 text-red-500",
  info: "bg-blue-500/10 text-blue-600",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600"
};

export const ACTOR_ROLE_COLORS: Record<AuditActor["role"], string> = {
  admin: "bg-foreground text-background",
  customer: "bg-blue-500/10 text-blue-600",
  system: "bg-secondary text-muted-foreground",
  unknown: "bg-red-500/10 text-red-500"
};

export const AUDIT_EVENTS: readonly AuditEvent[] = [
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Dispatch confirmation → eleanor@marte.co",
    id: "evt-001",
    ip: undefined,
    severity: "success",
    target: "MR-9241",
    timestamp: "Oct 25, 2023 09:46:12"
  },
  {
    action: "order.shipped",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "orders",
    detail: "DHL Express — 1Z999AA10123456784",
    id: "evt-002",
    ip: undefined,
    severity: "info",
    target: "MR-9241",
    timestamp: "Oct 25, 2023 09:45:38"
  },
  {
    action: "email.failed",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Dispatch confirmation → adrian@outlook.com — SMTP 550",
    id: "evt-003",
    ip: undefined,
    severity: "error",
    target: "MR-9238",
    timestamp: "Oct 25, 2023 09:30:05"
  },
  {
    action: "settings.updated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "settings",
    detail: "Free shipping threshold: $200 → $150",
    id: "evt-004",
    ip: "82.132.44.91",
    severity: "warning",
    target: "Shipping",
    timestamp: "Oct 25, 2023 08:14:22"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Fulfillment started → eleanor@marte.co",
    id: "evt-005",
    ip: undefined,
    severity: "success",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 15:11:04"
  },
  {
    action: "order.fulfillment_started",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "orders",
    detail: "3 items picked and packed",
    id: "evt-006",
    ip: undefined,
    severity: "info",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 15:10:45"
  },
  {
    action: "product.updated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "catalog",
    detail: "Price: $1,750 → $1,850",
    id: "evt-007",
    ip: "82.132.44.91",
    severity: "info",
    target: "Aura Hoop I",
    timestamp: "Oct 24, 2023 14:55:10"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Payment receipt → eleanor@marte.co",
    id: "evt-008",
    ip: undefined,
    severity: "success",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 14:34:18"
  },
  {
    action: "order.payment_captured",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "orders",
    detail: "$4,250.00 via Visa •••• 4242",
    id: "evt-009",
    ip: undefined,
    severity: "success",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 14:33:52"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Order confirmation → eleanor@marte.co",
    id: "evt-010",
    ip: undefined,
    severity: "success",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 14:33:01"
  },
  {
    action: "order.placed",
    actor: { initials: "EH", name: "Eleanor H. Sterling", role: "customer" },
    category: "orders",
    detail: "3 items — $4,250.00",
    id: "evt-011",
    ip: "82.132.22.15",
    severity: "info",
    target: "MR-9241",
    timestamp: "Oct 24, 2023 14:32:44"
  },
  {
    action: "customer.tier_upgrade",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "customers",
    detail: "Adrian Wentworth: Gold → VIP",
    id: "evt-012",
    ip: undefined,
    severity: "info",
    target: "CUST-8874",
    timestamp: "Oct 24, 2023 12:00:00"
  },
  {
    action: "product.created",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "catalog",
    detail: "Celestial collection — $2,400",
    id: "evt-013",
    ip: "82.132.44.91",
    severity: "info",
    target: "Nova Ring II",
    timestamp: "Oct 24, 2023 10:22:15"
  },
  {
    action: "product.deleted",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "catalog",
    detail: "Permanently deleted",
    id: "evt-014",
    ip: "82.132.44.91",
    severity: "warning",
    target: "Legacy Pendant",
    timestamp: "Oct 24, 2023 10:18:44"
  },
  {
    action: "auth.login",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "auth",
    detail: "Email/password login",
    id: "evt-015",
    ip: "82.132.44.91",
    severity: "info",
    target: "Admin Panel",
    timestamp: "Oct 24, 2023 09:05:33"
  },
  {
    action: "order.refund_initiated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "orders",
    detail: "$840 refund — Visa •••• 1881",
    id: "evt-016",
    ip: "82.132.44.91",
    severity: "warning",
    target: "MR-9224",
    timestamp: "Oct 23, 2023 16:42:19"
  },
  {
    action: "email.deferred",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Order confirm → l.chen@gmail.com — retry 30m",
    id: "evt-017",
    ip: undefined,
    severity: "warning",
    target: "MR-9235",
    timestamp: "Oct 23, 2023 14:01:55"
  },
  {
    action: "settings.updated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "settings",
    detail: "VAT exemption for non-EU exports",
    id: "evt-018",
    ip: "82.132.44.91",
    severity: "info",
    target: "Tax Rules",
    timestamp: "Oct 23, 2023 11:30:08"
  },
  {
    action: "auth.login_failed",
    actor: { initials: "??", name: "Unknown", role: "unknown" },
    category: "auth",
    detail: "IP blocked after 5 attempts",
    id: "evt-019",
    ip: "91.203.12.44",
    severity: "error",
    target: "Admin Panel",
    timestamp: "Oct 22, 2023 23:14:07"
  },
  {
    action: "customer.registered",
    actor: { initials: "TR", name: "Tomas Rivera", role: "customer" },
    category: "customers",
    detail: "Online store registration",
    id: "evt-020",
    ip: "84.78.22.10",
    severity: "info",
    target: "CUST-6400",
    timestamp: "Oct 22, 2023 18:05:33"
  },
  {
    action: "order.placed",
    actor: { initials: "AW", name: "Adrian Wentworth", role: "customer" },
    category: "orders",
    detail: "1 item — $12,800.00",
    id: "evt-021",
    ip: "44.22.91.05",
    severity: "info",
    target: "MR-9238",
    timestamp: "Oct 22, 2023 16:44:12"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Order confirmation → adrian@outlook.com",
    id: "evt-022",
    ip: undefined,
    severity: "success",
    target: "MR-9238",
    timestamp: "Oct 22, 2023 16:44:30"
  },
  {
    action: "product.updated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "catalog",
    detail: "Description updated",
    id: "evt-023",
    ip: "82.132.44.91",
    severity: "info",
    target: "Celestial Pendant",
    timestamp: "Oct 22, 2023 14:20:11"
  },
  {
    action: "order.payment_captured",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "orders",
    detail: "$12,800.00 via Amex •••• 0088",
    id: "evt-024",
    ip: undefined,
    severity: "success",
    target: "MR-9238",
    timestamp: "Oct 22, 2023 16:45:01"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "Payment receipt → adrian@outlook.com",
    id: "evt-025",
    ip: undefined,
    severity: "success",
    target: "MR-9238",
    timestamp: "Oct 22, 2023 16:45:22"
  },
  {
    action: "settings.updated",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "settings",
    detail: "Updated support email address",
    id: "evt-026",
    ip: "82.132.44.91",
    severity: "info",
    target: "Store Info",
    timestamp: "Oct 22, 2023 10:05:00"
  },
  {
    action: "auth.login",
    actor: { initials: "MC", name: "Marcin C.", role: "admin" },
    category: "auth",
    detail: "Email/password login",
    id: "evt-027",
    ip: "82.132.44.91",
    severity: "info",
    target: "Admin Panel",
    timestamp: "Oct 22, 2023 09:58:44"
  },
  {
    action: "customer.registered",
    actor: { initials: "SN", name: "Sofia Nakamura", role: "customer" },
    category: "customers",
    detail: "Online store registration",
    id: "evt-028",
    ip: "103.41.8.22",
    severity: "info",
    target: "CUST-7645",
    timestamp: "Oct 21, 2023 22:18:05"
  },
  {
    action: "order.placed",
    actor: { initials: "LC", name: "Lydia Chen", role: "customer" },
    category: "orders",
    detail: "2 items — $1,150.00",
    id: "evt-029",
    ip: "119.74.55.18",
    severity: "info",
    target: "MR-9235",
    timestamp: "Oct 21, 2023 20:11:33"
  },
  {
    action: "email.sent",
    actor: { initials: "SY", name: "System", role: "system" },
    category: "email",
    detail: "VIP welcome package → c.dubois@icloud.com",
    id: "evt-030",
    ip: undefined,
    severity: "success",
    target: "CUST-6820",
    timestamp: "Oct 21, 2023 12:00:00"
  }
];
