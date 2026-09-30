import { type JSX } from "react"

import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { Image } from "~/src/presentation/components/custom/image"
import { useAdminDashboardSnapshot } from "~/src/presentation/components/custom/pages/admin/dashboard/hooks/use-admin-dashboard-snapshot"

export const DashboardTopProducts = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  const { data: snapshot } = useAdminDashboardSnapshot()

  return (
    <Card className="border-border/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("dashboard.topProducts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {snapshot.topProducts.length === 0 ? (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">{t("dashboard.topProducts.empty")}</p>
        ) : (
          snapshot.topProducts.map((product) => (
            <div key={product.productId} className="flex items-center gap-4 rounded-lg p-2.5 transition-colors hover:bg-secondary/50">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {product.imageUrl === undefined ? (
                  <div className="flex size-full items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {product.name.slice(0, PRODUCT_INITIALS_LENGTH).toUpperCase()}
                  </div>
                ) : (
                  <Image src={product.imageUrl} alt="" width={48} height={48} className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.category === "" ? t("dashboard.topProducts.uncategorized") : product.category}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {formatPrice(product.revenueMinorUnits, product.currencyCode, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.topProducts.soldCount", {
                    count: format.number(product.sold),
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

const PRODUCT_INITIALS_LENGTH = 2
