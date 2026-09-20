import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { type DataGridSkeletonVariant } from "~/src/presentation/components/custom/datagrid/lib/data-grid.types"

/** Overrides the shared `rounded-lg` skeleton default — thin row bars look like pills at that radius. */
const DataGridSkeletonBlock = ({ className, ...props }: Readonly<ComponentProps<typeof Skeleton>>): JSX.Element => (
  <Skeleton className={cn("rounded-sm", className)} {...props} />
)

const DATA_GRID_SKELETON_DEFAULT = <DataGridSkeletonBlock className="h-4 w-full max-w-[80%]" />

const DATA_GRID_SKELETON_BY_VARIANT = {
  badge: <DataGridSkeletonBlock className="h-6 w-18 rounded-full" />,
  checkbox: (
    <div className="flex w-full items-center justify-center">
      <DataGridSkeletonBlock className="size-4" />
    </div>
  ),
  date: <DataGridSkeletonBlock className="h-4 w-full max-w-28" />,
  icon: (
    <div className="flex w-full items-center justify-center">
      <DataGridSkeletonBlock className="size-8 rounded-md" />
    </div>
  ),
  iconEnd: (
    <div className="flex w-full items-center justify-end">
      <DataGridSkeletonBlock className="size-8 rounded-md" />
    </div>
  ),
  number: (
    <div className="flex w-full items-center justify-end">
      <DataGridSkeletonBlock className="h-4 w-8" />
    </div>
  ),
  recordId: <DataGridSkeletonBlock className="h-4 w-72 max-w-full" />,
  text: <DataGridSkeletonBlock className="h-4 w-full max-w-[90%]" />,
  thumbnail: <DataGridSkeletonBlock className="size-9 shrink-0 rounded-md" />,
  title: (
    <div className="flex h-9 w-full min-w-0 flex-col justify-center gap-1">
      <DataGridSkeletonBlock className="h-3 w-full max-w-48" />
      <DataGridSkeletonBlock className="h-2.5 w-full max-w-32" />
    </div>
  ),
} satisfies Record<DataGridSkeletonVariant, JSX.Element>

export const renderDataGridSkeletonContent = (variant: DataGridSkeletonVariant | undefined): JSX.Element => {
  if (variant === undefined) {
    return DATA_GRID_SKELETON_DEFAULT
  }

  return DATA_GRID_SKELETON_BY_VARIANT[variant]
}
