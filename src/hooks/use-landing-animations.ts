import type { RefObject } from "react";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";

interface LandingAnimationsProps {
  rootRef: RefObject<HTMLDivElement | null>;
}

export function useLandingAnimations({ rootRef }: LandingAnimationsProps) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.batch(".reveal", {
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              duration: 0.9,
              ease: "power2.out",
              overwrite: true,
              stagger: 0.08,
              y: 0
            });
          },
          once: true,
          start: "top 88%"
        });

        gsap.set(".reveal", { autoAlpha: 0, y: 28 });

        gsap.utils.toArray<HTMLElement>(".parallax-wrap").forEach((wrap) => {
          const img = wrap.querySelector(".parallax-img");
          if (!img) {
            return;
          }

          gsap.fromTo(
            img,
            { yPercent: -6 },
            {
              ease: "none",
              scrollTrigger: { end: "bottom top", scrub: true, start: "top bottom", trigger: wrap },
              yPercent: 6
            }
          );
        });

        gsap.utils.toArray<HTMLElement>(".line-reveal").forEach((line) => {
          gsap.fromTo(
            line,
            { scaleX: 0, transformOrigin: "left center" },
            {
              duration: 1,
              ease: "power2.out",
              scaleX: 1,
              scrollTrigger: { once: true, start: "top 92%", trigger: line }
            }
          );
        });
      });
    },
    { scope: rootRef }
  );
}
