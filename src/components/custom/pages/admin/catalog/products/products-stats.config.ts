import { AlertTriangle, CheckCircle2, Package, PencilLine, type LucideIcon } from "lucide-react";

import { PRODUCT_INVENTORY_LEVEL, PRODUCT_STATUS } from "~/src/modules/product/product.constants";
import type { Product } from "~/src/modules/product/product.types";

export type ProductStatKey = keyof Product["stats"];

export interface ProductStatCardConfig {
  readonly filterInventoryLevel?: (typeof PRODUCT_INVENTORY_LEVEL)[keyof typeof PRODUCT_INVENTORY_LEVEL];
  readonly filterStatus?: (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
  readonly gradient: string;
  readonly icon: LucideIcon;
  readonly key: ProductStatKey;
}

export const PRODUCT_STAT_CARDS: readonly ProductStatCardConfig[] = [
  {
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Package,
    key: "total"
  },
  {
    filterStatus: PRODUCT_STATUS.PUBLISHED,
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: CheckCircle2,
    key: "active"
  },
  {
    filterStatus: PRODUCT_STATUS.DRAFT,
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: PencilLine,
    key: "draft"
  },
  {
    filterInventoryLevel: PRODUCT_INVENTORY_LEVEL.LOW,
    gradient: "from-orange-500/20 via-orange-500/6 to-transparent",
    icon: AlertTriangle,
    key: "lowStock"
  }
];
