import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"

import { getAdminContentPagesQuery } from "~/src/modules/content-page/use-cases/get-admin-content-pages"

import { Card } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { ContentPageListItem } from "~/src/presentation/components/custom/pages/admin/content/content-page-list-item"

export const ContentPageList = (): JSX.Element => {
  const { data: pages } = useSuspenseQuery(getAdminContentPagesQuery())

  return (
    <Card className={ADMIN_CARD_CLASS}>
      <ul className="divide-y divide-border/60">
        {pages.map((page) => (
          <ContentPageListItem key={page.handle} page={page} />
        ))}
      </ul>
    </Card>
  )
}
