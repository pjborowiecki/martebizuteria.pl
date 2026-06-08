import type { RefObject } from "react";

import { ScrollTrigger, gsap, useGSAP } from "~/src/lib/gsap";

const AUTO_ALPHA_HIDDEN = 0;
const AUTO_ALPHA_VISIBLE = 1;
const EMPTY_LIST_LENGTH = 0;
const GSAP_IMMEDIATE_DELAY = 0;
const LINE_REVEAL_DURATION = 1;
const LINE_REVEAL_SCALE_HIDDEN = 0;
const LINE_REVEAL_SCALE_VISIBLE = 1;
const NO_STAGGER = 0;
const PARALLAX_Y_PERCENT_END = 6;
const PARALLAX_Y_PERCENT_START = -6;
const REVEAL_DURATION = 0.9;
const REVEAL_IN_VIEW_THRESHOLD = 0.92;
const REVEAL_OFFSET_Y = 28;
const REVEAL_STAGGER = 0.08;
const REVEAL_Y_RESET = 0;
const SCROLL_TRIGGER_BATCH_START = "top 92%";
const SCROLL_TRIGGER_LINE_START = "top 92%";
const VIEWPORT_MIN_BOTTOM = 0;

interface LandingAnimationsProps {
  rootRef: RefObject<HTMLDivElement | null>;
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

function setupLineReveals(root: HTMLElement): void {
  gsap.utils.toArray<HTMLElement>(".line-reveal", root).forEach((line) => {
    if (isElementInRevealViewport(line)) {
      gsap.set(line, { scaleX: LINE_REVEAL_SCALE_VISIBLE, transformOrigin: "left center" });
      return;
    }

    gsap.fromTo(
      line,
      { scaleX: LINE_REVEAL_SCALE_HIDDEN, transformOrigin: "left center" },
      {
        duration: LINE_REVEAL_DURATION,
        ease: "power2.out",
        scaleX: LINE_REVEAL_SCALE_VISIBLE,
        scrollTrigger: { once: true, start: SCROLL_TRIGGER_LINE_START, trigger: line }
      }
    );
  });
}

function setupParallax(root: HTMLElement): void {
  gsap.utils.toArray<HTMLElement>(".parallax-wrap", root).forEach((wrap) => {
    const img = wrap.querySelector(".parallax-img");
    if (img === null) {
      return;
    }

    gsap.fromTo(
      img,
      { yPercent: PARALLAX_Y_PERCENT_START },
      {
        ease: "none",
        scrollTrigger: { end: "bottom top", scrub: true, start: "top bottom", trigger: wrap },
        yPercent: PARALLAX_Y_PERCENT_END
      }
    );
  });
}

function showReducedMotionContent(root: HTMLElement): void {
  gsap.set(gsap.utils.toArray<HTMLElement>(".reveal, .line-reveal", root), {
    autoAlpha: AUTO_ALPHA_VISIBLE,
    clearProps: "transform"
  });
}

export function useLandingAnimations({ rootRef }: LandingAnimationsProps) {
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setupScrollReveals(root);
        setupLineReveals(root);
        setupParallax(root);

        gsap.delayedCall(GSAP_IMMEDIATE_DELAY, () => {
          ScrollTrigger.refresh();
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        showReducedMotionContent(root);
      });

      return () => {
        mm.revert();
      };
    },
    { scope: rootRef }
  );
}
