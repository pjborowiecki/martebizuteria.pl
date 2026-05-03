import type { RefObject } from "react";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";

interface ProductAnimationsProps {
  readonly dependencies?: unknown[];
  readonly rootRef: RefObject<HTMLElement | null>;
}

export function useProductAnimations({ dependencies = [], rootRef }: ProductAnimationsProps) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(".reveal", { autoAlpha: 0, y: 24 });
        ScrollTrigger.batch(".reveal", {
          onEnter: (batch) => {
            gsap.to(batch, { autoAlpha: 1, duration: 0.7, ease: "power2.out", stagger: 0.08, y: 0 });
          },
          once: true,
          start: "top 92%"
        });

        gsap.utils.toArray<HTMLElement>(".parallax-wrap").forEach((wrap) => {
          const img = wrap.querySelector(".parallax-img");
          if (img === null) {
            return;
          }

          gsap.fromTo(
            img,
            { yPercent: -4 },
            { ease: "none", scrollTrigger: { end: "bottom top", scrub: true, start: "top bottom", trigger: wrap }, yPercent: 4 }
          );
        });
      });
    },
    { dependencies, scope: rootRef }
  );
}
