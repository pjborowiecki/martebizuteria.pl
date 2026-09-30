import { type Order } from "~/src/modules/order/order.types"

import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const isAdminOrderTab = (value: string): value is AdminOrderTab => (ORDER_TABS as readonly string[]).includes(value)

export const isAdminOrderStatus = (value: string): value is Order["select"]["status"] =>
  (ADMIN_ORDER_STATUSES as readonly string[]).includes(value)

export const isAdminOrderPaymentUiKey = (value: string): value is AdminOrderPaymentUiKey =>
  ADMIN_ORDER_PAYMENT_UI_KEYS.some((key) => key === value)

export const isAdminOrderFulfillmentUiKey = (value: string): value is AdminOrderFulfillmentUiKey =>
  ADMIN_ORDER_FULFILLMENT_UI_KEYS.some((key) => key === value)

export const ADMIN_ORDERS_PAGE_SIZE = 25

export const ORDER_QUERY_STALE_MS = 60_000

export const ORDER_TABS = ["all", "pending", "unfulfilled", "shipped", "delivered"] as const

export type AdminOrderTab = (typeof ORDER_TABS)[number]

export const ADMIN_ORDER_TAB = {
  ALL: "all",
  DELIVERED: "delivered",
  PENDING: "pending",
  SHIPPED: "shipped",
  UNFULFILLED: "unfulfilled",
} as const satisfies Record<string, AdminOrderTab>

export const ADMIN_ORDER_PAYMENT_UI_KEY = {
  AUTHORIZED: "authorized",
  PAID: "paid",
  REFUNDED: "refunded",
} as const

export const ADMIN_ORDER_FULFILLMENT_UI_KEY = {
  DELIVERED: "delivered",
  PENDING: "pending",
  RETURNED: "returned",
  SHIPPED: "shipped",
  UNFULFILLED: "unfulfilled",
} as const

export const ADMIN_ORDER_STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"] as const

const ADMIN_ORDER_PAYMENT_UI_KEYS = Object.values(ADMIN_ORDER_PAYMENT_UI_KEY)

const ADMIN_ORDER_FULFILLMENT_UI_KEYS = Object.values(ADMIN_ORDER_FULFILLMENT_UI_KEY)

export const ADMIN_ORDER_STAT_FILTER = {
  PENDING: "pending",
  TOTAL: "total",
} as const

export type AdminOrderStatFilter = (typeof ADMIN_ORDER_STAT_FILTER)[keyof typeof ADMIN_ORDER_STAT_FILTER]

export const ADMIN_ORDER_COMPLETED_STATUS = "completed" as const

export const ADMIN_ORDER_COUNTABLE_STATUSES = ["completed", "processing", "pending", "cancelled", "refunded"] as const

export const ADMIN_ORDER_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow",
} as const

export const ADMIN_ORDER_TABLE_COLUMN_ID = {
  actions: "actions",
  createdAt: "createdAt",
  customer: "customer",
  email: "email",
  fulfillment: "fulfillment",
  itemCount: "itemCount",
  orderId: "orderId",
  payment: "payment",
  select: "select",
  status: "status",
  total: "total",
} as const

export const ADMIN_ORDER_TABLE_DEFAULT_COLUMN_VISIBILITY = {} as const

export const ADMIN_ORDER_TABLE_COLUMN_SIZE = {
  actions: 48,
  createdAt: 160,
  customer: 280,
  email: 220,
  fulfillment: 160,
  itemCount: 88,
  orderId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  payment: 120,
  select: 44,
  status: 130,
  total: 120,
} as const

export const ADMIN_ORDER_TABLE_COLUMN_PINNING = {
  end: [ADMIN_ORDER_TABLE_COLUMN_ID.status, ADMIN_ORDER_TABLE_COLUMN_ID.payment, ADMIN_ORDER_TABLE_COLUMN_ID.actions],
  start: [ADMIN_ORDER_TABLE_COLUMN_ID.select, ADMIN_ORDER_TABLE_COLUMN_ID.orderId, ADMIN_ORDER_TABLE_COLUMN_ID.createdAt],
}

export const ORDER_ERROR_CODES = {
  INVALID_STATE: "ORDER_INVALID_STATE",
  NOT_FOUND: "ORDER_NOT_FOUND",
} as const

export type AdminOrderPaymentUiKey = (typeof ADMIN_ORDER_PAYMENT_UI_KEY)[keyof typeof ADMIN_ORDER_PAYMENT_UI_KEY]

export type AdminOrderFulfillmentUiKey = (typeof ADMIN_ORDER_FULFILLMENT_UI_KEY)[keyof typeof ADMIN_ORDER_FULFILLMENT_UI_KEY]

export const ADMIN_ORDER_STATUS_LABEL_KEYS: Record<Order["select"]["status"], string> = {
  cancelled: "status.cancelled",
  completed: "status.completed",
  pending: "status.pending",
  processing: "status.processing",
  refunded: "status.refunded",
}

export const ADMIN_ORDER_PAYMENT_LABEL_KEYS: Record<(typeof ADMIN_ORDER_PAYMENT_UI_KEY)[keyof typeof ADMIN_ORDER_PAYMENT_UI_KEY], string> =
  {
    authorized: "payment.authorized",
    paid: "payment.paid",
    refunded: "payment.refunded",
  }

export const ADMIN_ORDER_FULFILLMENT_LABEL_KEYS: Record<
  (typeof ADMIN_ORDER_FULFILLMENT_UI_KEY)[keyof typeof ADMIN_ORDER_FULFILLMENT_UI_KEY],
  string
> = {
  delivered: "fulfillment.delivered",
  pending: "fulfillment.pending",
  returned: "fulfillment.returned",
  shipped: "fulfillment.shipped",
  unfulfilled: "fulfillment.unfulfilled",
}

export interface AdminOrderPaymentStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}

export interface AdminOrderStatusStyle {
  readonly className?: string
  readonly variant: "default" | "destructive" | "outline" | "secondary"
}

export const ORDER_STATUS_BADGE_STYLES: Record<Order["select"]["status"], AdminOrderStatusStyle> = {
  cancelled: {
    variant: "destructive",
  },
  completed: {
    className: "bg-emerald-600 hover:bg-emerald-700",
    variant: "default",
  },
  pending: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    variant: "outline",
  },
  processing: {
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    variant: "outline",
  },
  refunded: {
    variant: "destructive",
  },
}

export const PAYMENT_BADGE_STYLES: Record<string, AdminOrderPaymentStyle> = {
  authorized: {
    variant: "outline",
  },
  paid: {
    className: "bg-emerald-600 hover:bg-emerald-700",
    variant: "default",
  },
  refunded: {
    variant: "destructive",
  },
}

export const FULFILLMENT_DOT_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500",
  pending: "bg-amber-500",
  returned: "bg-red-400",
  shipped: "bg-blue-500",
  unfulfilled: "bg-muted-foreground/30",
}

export const ORDER_QUERY_KEYS = {
  ADMIN: {
    ORDERS: ["admin", "orders"] as const,
    PAGE: ["admin", "orders", "page"] as const,
    STATS: ["admin", "orders", "stats"] as const,
  },
} as const

export const ORDER_MUTATION_KEYS = {
  CANCEL: ["order", "cancelOrder"] as const,
  FULFILL: ["order", "fulfillOrder"] as const,
  SHIP: ["order", "shipOrder"] as const,
} as const
