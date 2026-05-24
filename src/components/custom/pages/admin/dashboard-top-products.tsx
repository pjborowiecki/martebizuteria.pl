import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";

import { Image } from "~/src/components/custom/image";

const TOP_PRODUCTS = [
  {
    category: "Earrings",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80",
    name: "Aura Hoop I",
    revenue: "$14,280",
    sold: 42
  },
  {
    category: "Earrings",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80",
    name: "Lune Drop",
    revenue: "$15,960",
    sold: 38
  },
  {
    category: "Bracelets",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=200&q=80",
    name: "Arc Cuff",
    revenue: "$16,120",
    sold: 31
  },
  {
    category: "Rings",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=200&q=80",
    name: "Forma II",
    revenue: "$12,960",
    sold: 27
  }
] as const;

export function DashboardTopProducts(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("dashboard.topProducts.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {TOP_PRODUCTS.map((product) => (
          <div key={product.name} className="flex items-center gap-4 rounded-lg p-2.5 transition-colors hover:bg-secondary/50">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={product.image} alt="" width={48} height={48} className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">{product.revenue}</p>
              <p className="text-xs text-muted-foreground">{`${product.sold} ${t("dashboard.topProducts.sold")}`}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
