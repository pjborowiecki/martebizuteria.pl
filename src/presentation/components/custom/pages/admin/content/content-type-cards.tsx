import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CONTENT_TYPES } from "~/src/data/content"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const ContentTypeCards = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div className="mb-5 grid shrink-0 gap-5 sm:grid-cols-3">
      {CONTENT_TYPES.map((ct) => (
        <Card
          key={ct.key}
          className="group cursor-pointer overflow-hidden border-border/40 bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none transition-colors hover:bg-secondary/30"
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-lg bg-background/50 shadow-sm backdrop-blur-md">
              <ct.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(`content.types.${ct.key}.title`)}</p>
              <p className="text-xs text-muted-foreground">{t(`content.types.${ct.key}.description`)}</p>
            </div>
            <span className="font-mono text-2xl font-semibold text-muted-foreground/30">{ct.count}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
