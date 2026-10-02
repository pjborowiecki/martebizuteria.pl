import { type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { getAdminContentPagesQuery } from "~/src/modules/content-page/use-cases/get-admin-content-pages"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ContentPageList } from "~/src/presentation/components/custom/pages/admin/content/content-page-list"

import { ROUTES } from "~/src/routes"

const AdminContentRoute = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const breadcrumbs = useMemo(() => [{ href: ROUTES.ADMIN, label: t("nav.dashboard") }], [t])

  return (
    <>
      <AdminHeader breadcrumbs={breadcrumbs} description={t("content.description")} title={t("content.title")} />

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <ContentPageList />
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/admin/content/")({
  component: AdminContentRoute,
  loader: ({ context }) => context.queryClient.query({ ...getAdminContentPagesQuery(), staleTime: "static" }),
})
