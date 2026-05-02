import { useMemo, type JSX } from "react";

import { useTranslations } from "use-intl";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { LANDING_SHOP_COLLECTIONS } from "~/src/data/landing-data";

const ASPECT_RATIO_PORTRAIT = 0.8;

type CollectionItem = (typeof LANDING_SHOP_COLLECTIONS)[number];

interface CollectionCardProps {
  collection: CollectionItem;
}

function CollectionCard({ collection }: Readonly<CollectionCardProps>): JSX.Element {
  const t = useTranslations("landingPage.shopCollectionsSection");
  const params = useMemo(() => ({ handle: collection.slug }), [collection.slug]);

  return (
    <LocalizedLink className="reveal group block" params={params} to="/collections/$handle">
      <AspectRatio className="parallax-wrap overflow-hidden bg-secondary" ratio={ASPECT_RATIO_PORTRAIT}>
        <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
          <Image
            alt={t(collection.nameKey)}
            className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform group-hover:scale-[1.06]"
            height={1200}
            sizes="(max-width: 768px) 100vw, 33vw"
            src={collection.image}
            width={960}
          />
        </div>
      </AspectRatio>
      <div className="mt-5 space-y-2">
        <h3 className="font-serif text-xl leading-snug transition-colors duration-500 group-hover:text-muted-foreground lg:text-2xl">
          {t(collection.nameKey)}
        </h3>
        <p className="text-sm/relaxed text-muted-foreground">{t(collection.descKey)}</p>
      </div>
    </LocalizedLink>
  );
}

export function ShopCollectionsSection(): JSX.Element {
  const t = useTranslations("landingPage.shopCollectionsSection");

  return (
    <section className="mx-auto max-w-400 space-y-10 px-6 pb-20 lg:px-12 lg:pb-28">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
        </div>
        <LocalizedLink
          to="/collections"
          className="inline-flex h-12 shrink-0 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50 sm:self-end"
        >
          {t("cta")}
        </LocalizedLink>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {LANDING_SHOP_COLLECTIONS.map((col) => (
          <CollectionCard key={col.nameKey} collection={col} />
        ))}
      </div>
    </section>
  );
}
