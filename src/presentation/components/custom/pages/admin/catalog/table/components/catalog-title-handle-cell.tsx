import { type JSX } from "react"

const catalogSlugPath = (handle: string): string => (handle.startsWith("/") ? handle : `/${handle}`)

export const CatalogTitleHandleCell = ({
  handle,
  title,
}: Readonly<{
  handle: string
  title: string
}>): JSX.Element => (
  <div className="flex h-9 min-w-0 flex-col justify-center gap-1">
    <span className="truncate text-xs leading-none font-medium">{title}</span>
    <span className="truncate font-mono text-[10px] leading-none text-muted-foreground">{catalogSlugPath(handle)}</span>
  </div>
)
