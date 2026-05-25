import type { JSX } from "react";

import { Skeleton } from "~/src/components/shadcn/skeleton";

export function CheckoutFormSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-2/3 rounded-none" />
      <Skeleton className="h-32 w-full rounded-none" />
      <Skeleton className="h-32 w-full rounded-none" />
    </div>
  );
}
