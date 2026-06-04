import type { JSX } from "react";

import { cn } from "~/src/lib/utils";

import { Badge } from "~/src/components/shadcn/badge";

import { PRODUCT_STATUS, type ProductStatus } from "~/src/modules/product/product.constants";

const PRODUCT_STATUS_BADGE_CLASS: Record<ProductStatus, string> = {
  archived: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
};

interface ProductStatusBadgeProps {
  readonly label: string;
  readonly status: ProductStatus;
}

export function ProductStatusBadge({ label, status }: Readonly<ProductStatusBadgeProps>): JSX.Element {
  const isPublished = status === PRODUCT_STATUS.PUBLISHED;

  return (
    <Badge
      variant="outline"
      className={cn("h-5 border-0 px-2 py-0.5 text-[11px] font-medium", PRODUCT_STATUS_BADGE_CLASS[status], isPublished && "ring-0")}
    >
      {label}
    </Badge>
  );
}
