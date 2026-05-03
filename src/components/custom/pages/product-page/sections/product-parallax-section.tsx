import type { JSX } from "react";

import { Image } from "~/src/components/custom/image";

export interface ProductParallaxSectionProps {
  readonly imageSrc: string;
  readonly productTitle: string;
}

export function ProductParallaxSection({ imageSrc, productTitle }: ProductParallaxSectionProps): JSX.Element {
  return (
    <section className="parallax-wrap relative h-[40svh] overflow-hidden lg:h-[50svh]">
      <div className="parallax-img absolute inset-x-0 inset-y-[-8%]">
        <Image alt={productTitle} className="size-full object-cover" height={1400} sizes="100vw" src={imageSrc} width={2400} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/15" />
    </section>
  );
}
