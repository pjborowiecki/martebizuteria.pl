import { CheckCircle2, Layers, type LucideIcon, Package, PencilLine } from "lucide-react";

import { COLLECTION_STATUS } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

export type CollectionStatKey = keyof Collection["stats"];

export interface CollectionStatCardConfig {
  readonly filterStatus?: (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS];
  readonly gradient: string;
  readonly icon: LucideIcon;
  readonly key: CollectionStatKey;
}

export const COLLECTION_STAT_CARDS: readonly CollectionStatCardConfig[] = [
  {
    gradient: "from-violet-500/20 via-fuchsia-500/8 to-transparent",
    icon: Layers,
    key: "total"
  },
  {
    filterStatus: COLLECTION_STATUS.ACTIVE,
    gradient: "from-emerald-500/20 via-emerald-500/6 to-transparent",
    icon: CheckCircle2,
    key: "active"
  },
  {
    filterStatus: COLLECTION_STATUS.DRAFT,
    gradient: "from-amber-500/20 via-amber-500/6 to-transparent",
    icon: PencilLine,
    key: "draft"
  },
  {
    gradient: "from-purple-500/20 via-violet-500/6 to-transparent",
    icon: Package,
    key: "avgProducts"
  }
];
