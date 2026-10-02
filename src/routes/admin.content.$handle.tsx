import { type JSX } from "react"

import { createFileRoute, notFound } from "@tanstack/react-router"

import { isContentPageHandle } from "~/src/modules/content-page/content-page.utils"
import { getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"

import { ContentPageEditor } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor"

const AdminContentPageRoute = (): JSX.Element => <ContentPageEditor handle={Route.useLoaderData()} />

export const Route = createFileRoute("/admin/content/$handle")({
  component: AdminContentPageRoute,
  loader: async ({ context, params: { handle } }) => {
    if (!isContentPageHandle(handle)) {
      throw notFound()
    }

    await context.queryClient.query(getAdminContentPageQuery(handle))

    return handle
  },
})
