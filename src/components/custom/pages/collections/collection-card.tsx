import { type JSX, useMemo } from "react";

import { useLocale } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { resolveCollectionDescription, resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";

const ASPECT_RATIO_PORTRAIT = 0.8;

export function CollectionCard({
  collection
}: Readonly<{ collection: Pick<Collection["select"], "descriptions" | "handle" | "id" | "image" | "titles"> }>): JSX.Element {
  const locale = useLocale();
  const params = useMemo(() => ({ handle: collection.handle }), [collection.handle]);
  const title = resolveCollectionTitle(collection.titles, locale);
  const description = resolveCollectionDescription(collection.descriptions, locale);
  const imageSrc = getProductImageUrl(collection.image);

  return (
    <LocalizedLink className="group block" params={params} to={CONSTANTS.ROUTES.COLLECTION}>
      <AspectRatio className="overflow-hidden bg-secondary" ratio={ASPECT_RATIO_PORTRAIT}>
        <Image
          alt={title}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform group-hover:scale-[1.06]"
          height={1200}
          sizes="(max-width: 768px) 100vw, 33vw"
          src={imageSrc}
          width={960}
        />
      </AspectRatio>
      <div className="mt-5 space-y-2">
        <h2 className="font-serif text-xl leading-snug transition-colors duration-500 group-hover:text-muted-foreground lg:text-2xl">
          {title}
        </h2>
        {description !== "" && <p className="line-clamp-3 text-sm/relaxed text-muted-foreground">{description}</p>}
      </div>
    </LocalizedLink>
  );
}
