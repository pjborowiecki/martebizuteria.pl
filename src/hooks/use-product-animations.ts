import type { RefObject } from "react";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";

const AUTO_ALPHA_HIDDEN = 0;
const AUTO_ALPHA_VISIBLE = 1;
const EMPTY_LIST_LENGTH = 0;
const NO_STAGGER = 0;
const REVEAL_DURATION = 0.7;
const REVEAL_IN_VIEW_THRESHOLD = 0.92;
const REVEAL_OFFSET_Y = 24;
const REVEAL_STAGGER = 0.08;
const REVEAL_Y_RESET = 0;
const SCROLL_TRIGGER_BATCH_START = "top 92%";
const VIEWPORT_MIN_BOTTOM = 0;

interface ProductAnimationsProps {
  readonly dependencies?: unknown[];
  readonly rootRef: RefObject<HTMLElement | null>;
}

function isElementInRevealViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight * REVEAL_IN_VIEW_THRESHOLD && rect.bottom > VIEWPORT_MIN_BOTTOM;
}

function animateRevealElements(elements: readonly HTMLElement[], stagger = false): void {
  gsap.to(elements, {
    autoAlpha: AUTO_ALPHA_VISIBLE,
    duration: REVEAL_DURATION,
    ease: "power2.out",
    overwrite: true,
    stagger: stagger ? REVEAL_STAGGER : NO_STAGGER,
    y: REVEAL_Y_RESET
  });
}

function setupScrollReveals(root: HTMLElement): void {
  const revealElementsList = gsap.utils.toArray<HTMLElement>(".reveal", root);

  if (revealElementsList.length === EMPTY_LIST_LENGTH) {
    return;
  }

  gsap.set(revealElementsList, { autoAlpha: AUTO_ALPHA_HIDDEN, y: REVEAL_OFFSET_Y });

  ScrollTrigger.batch(revealElementsList, {
    onEnter: (batch) => {
      const elements = batch.filter((element): element is HTMLElement => element instanceof HTMLElement);
      animateRevealElements(elements, true);
    },
    once: true,
    start: SCROLL_TRIGGER_BATCH_START
  });

  const inViewElements = revealElementsList.filter((element) => isElementInRevealViewport(element));
  if (inViewElements.length > EMPTY_LIST_LENGTH) {
    animateRevealElements(inViewElements, true);
  }
}

export function useProductAnimations({ dependencies = [], rootRef }: ProductAnimationsProps) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setupScrollReveals(root);

        gsap.utils.toArray<HTMLElement>(".parallax-wrap", root).forEach((wrap) => {
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

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(gsap.utils.toArray<HTMLElement>(".reveal", root), {
          autoAlpha: AUTO_ALPHA_VISIBLE,
          y: REVEAL_Y_RESET
        });
      });
    },
    { dependencies, scope: rootRef }
  );
}
