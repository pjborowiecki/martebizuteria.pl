import type { JSX } from "react";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import type { DataGridSkeletonVariant } from "~/src/components/custom/datagrid/lib/data-grid.types";

const DATA_GRID_SKELETON_DEFAULT = <Skeleton className="h-4 w-full max-w-[80%]" />;

const DATA_GRID_SKELETON_BY_VARIANT = {
  badge: <Skeleton className="h-6 w-18 rounded-full" />,
  checkbox: <Skeleton className="size-4 rounded-[4px]" />,
  date: <Skeleton className="h-4 w-28" />,
  icon: <Skeleton className="mx-auto size-8 rounded-md" />,
  iconEnd: (
    <div className="flex justify-end">
      <Skeleton className="size-8 rounded-md" />
    </div>
  ),
  number: <Skeleton className="ml-auto h-4 w-8" />,
  text: <Skeleton className="h-4 w-full max-w-[90%]" />,
  thumbnail: <Skeleton className="size-9 shrink-0 rounded-lg" />,
  title: (
    <div className="flex h-9 min-w-0 flex-col justify-center gap-1">
      <Skeleton className="h-3 w-[85%] max-w-48" />
      <Skeleton className="h-2.5 w-[55%] max-w-32" />
    </div>
  )
} satisfies Record<DataGridSkeletonVariant, JSX.Element>;

export function renderDataGridSkeletonContent(variant: DataGridSkeletonVariant | undefined): JSX.Element {
  if (variant === undefined) {
    return DATA_GRID_SKELETON_DEFAULT;
  }

  return DATA_GRID_SKELETON_BY_VARIANT[variant];
}
