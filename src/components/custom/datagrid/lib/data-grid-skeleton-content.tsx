import type { JSX } from "react";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import type { DataGridSkeletonVariant } from "~/src/components/custom/datagrid/lib/data-grid.types";

/** Column-specific loading placeholder aligned with real cell layout. */
export function renderDataGridSkeletonContent(variant: DataGridSkeletonVariant | undefined): JSX.Element {
  if (variant === undefined) {
    return <Skeleton className="h-4 w-full max-w-[80%]" />;
  }

  switch (variant) {
    case "checkbox": {
      return <Skeleton className="size-4 rounded-[4px]" />;
    }
    case "icon": {
      return <Skeleton className="mx-auto size-8 rounded-md" />;
    }
    case "iconEnd": {
      return (
        <div className="flex justify-end">
          <Skeleton className="size-8 rounded-md" />
        </div>
      );
    }
    case "thumbnail": {
      return <Skeleton className="size-9 shrink-0 rounded-lg" />;
    }
    case "title": {
      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Skeleton className="h-5 w-[85%] max-w-48" />
          <Skeleton className="h-4 w-[55%] max-w-32" />
        </div>
      );
    }
    case "badge": {
      return <Skeleton className="h-6 w-[4.5rem] rounded-full" />;
    }
    case "number": {
      return <Skeleton className="ml-auto h-4 w-8" />;
    }
    case "date": {
      return <Skeleton className="h-4 w-28" />;
    }
    case "text": {
      return <Skeleton className="h-4 w-full max-w-[90%]" />;
    }
  }
}
