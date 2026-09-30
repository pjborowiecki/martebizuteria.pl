import { type JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ADMIN_STAT_CAPTION_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

interface AdminStatCaptionProps {
  readonly caption?: string | undefined
  readonly valuesPending: boolean
}

export const AdminStatCaption = ({ caption, valuesPending }: Readonly<AdminStatCaptionProps>): JSX.Element | undefined => {
  if (valuesPending) {
    return <Skeleton className="h-3 w-28" />
  }

  if (caption === undefined) {
    return undefined
  }

  return <p className={ADMIN_STAT_CAPTION_CLASS}>{caption}</p>
}
