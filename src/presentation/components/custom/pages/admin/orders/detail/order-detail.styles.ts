import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  type LucideIcon,
  Mail,
  Package,
  ShieldAlert,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react"

import {
  ADMIN_ORDER_EMAIL_STATUS,
  ADMIN_ORDER_TIMELINE_KIND,
  type AdminOrderEmailStatus,
  type AdminOrderTimelineKind,
} from "~/src/modules/order/order.constants"

export const ORDER_TIMELINE_ICONS: Record<AdminOrderTimelineKind, LucideIcon> = {
  [ADMIN_ORDER_TIMELINE_KIND.DISPUTE]: ShieldAlert,
  [ADMIN_ORDER_TIMELINE_KIND.EMAIL]: Mail,
  [ADMIN_ORDER_TIMELINE_KIND.FULFILLMENT]: Package,
  [ADMIN_ORDER_TIMELINE_KIND.ORDER]: ShoppingBag,
  [ADMIN_ORDER_TIMELINE_KIND.PAYMENT]: CreditCard,
  [ADMIN_ORDER_TIMELINE_KIND.SHIPPING]: Truck,
}

export const ORDER_EMAIL_STATUS_CONFIG: Record<AdminOrderEmailStatus, EmailStatusConfig> = {
  [ADMIN_ORDER_EMAIL_STATUS.DEFERRED]: { className: "text-amber-500", icon: AlertTriangle },
  [ADMIN_ORDER_EMAIL_STATUS.FAILED]: { className: "text-red-500", icon: XCircle },
  [ADMIN_ORDER_EMAIL_STATUS.SENT]: { className: "text-emerald-500", icon: CheckCircle2 },
}

export const ORDER_DETAIL_CARD_CLASS = "border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent shadow-none"

export interface EmailStatusConfig {
  readonly className: string
  readonly icon: LucideIcon
}
