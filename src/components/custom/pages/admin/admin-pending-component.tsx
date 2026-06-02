import type { JSX } from "react";

import { AdminShellSkeleton } from "~/src/components/custom/pages/admin/admin-shell-skeleton";

/** Default admin route pending — layout-matched shell (sidebar + header + main). */
export function AdminPendingComponent(): JSX.Element {
  return <AdminShellSkeleton />;
}
