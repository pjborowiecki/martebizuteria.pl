import { createFileRoute } from "@tanstack/react-router"

import { requireAdminRole } from "~/src/integrations/better-auth/auth.routes"

import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

import { AdminSecurityPage } from "~/src/presentation/components/custom/pages/admin/security/admin-security-page"

export const Route = createFileRoute("/admin_/security")({
  beforeLoad: requireAdminRole,
  component: AdminSecurityPage,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...getCustomerProfileQuery(), staleTime: "static" })
  },
  staticData: {
    namespaces: ["pages.admin", "pages.account", "pages.auth.errors", "pages.auth.validations"],
  },
})
