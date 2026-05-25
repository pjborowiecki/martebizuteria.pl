"use client";

import { type JSX, useCallback, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Separator } from "~/src/components/shadcn/separator";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { ProductCard } from "~/src/components/custom/product-card";

interface WishlistItem {
  id: string;
  name: string;
  material: string;
  price: string;
  image: string;
  inStock: boolean;
}

const INITIAL_ITEMS: WishlistItem[] = [
  {
    id: "w1",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
    inStock: true,
    material: "18K Gold",
    name: "Lapis Lazuli Pendant",
    price: "€ 780.00"
  },
  {
    id: "w2",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
    inStock: true,
    material: "Rose Gold",
    name: "Aurelia Gold Ring",
    price: "€ 460.00"
  },
  {
    id: "w3",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
    inStock: true,
    material: "Sterling Silver",
    name: "Pearl Drop Earrings",
    price: "€ 950.00"
  },
  {
    id: "w4",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80",
    inStock: false,
    material: "White Gold / Sapphire",
    name: "Azure Necklace",
    price: "€ 1,400.00"
  },
  {
    id: "w5",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
    inStock: true,
    material: "Sterling Silver",
    name: "Heritage Silver Bracelet",
    price: "€ 680.00"
  },
  {
    id: "w6",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80",
    inStock: true,
    material: "Black Rhodium",
    name: "Midnight Choker",
    price: "€ 490.00"
  }
];

const EMPTY_LIST_LENGTH = 0;

export const Route = createFileRoute("/{-$locale}/account/wishlist")({
  component: WishlistPage
});

function WishlistProduct({ item, onRemove }: Readonly<{ item: WishlistItem; onRemove: (id: string) => void }>): JSX.Element {
  const t = useTranslations("account.wishlist");

  const handleToggle = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  return (
    <ProductCard
      href={CONSTANTS.ROUTES.PRODUCTS}
      image={item.image}
      name={item.name}
      detail={item.material}
      price={item.price}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      compact
      wishlisted
      onWishlistToggle={handleToggle}
      badge={item.inStock ? undefined : t("outOfStock")}
    />
  );
}

function WishlistPage(): JSX.Element {
  const t = useTranslations("account.wishlist");
  const [items, setItems] = useState<WishlistItem[]>(INITIAL_ITEMS);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">{t("subtitle", { count: items.length })}</p>
      </div>

      {items.length === EMPTY_LIST_LENGTH ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Heart className="size-8 text-muted-foreground/30" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <LocalizedLink
            to={CONSTANTS.ROUTES.PRODUCTS}
            className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
          >
            {t("browseProducts")}
          </LocalizedLink>
        </div>
      ) : (
        <>
          <Separator className="mb-0" />
          <div className="grid gap-x-5 gap-y-8 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <WishlistProduct key={item.id} item={item} onRemove={removeItem} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
