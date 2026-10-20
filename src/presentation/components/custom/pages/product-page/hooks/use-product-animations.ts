import { type RefObject } from "react"

import { ScrollTrigger, gsap, useGSAP } from "~/src/integrations/gsap/gsap.config"

const startsBelowTheFold = (element: HTMLElement): boolean => element.getBoundingClientRect().top >= window.innerHeight

const animateRevealElements = (elements: readonly HTMLElement[]): void => {
  gsap.to(elements, {
    autoAlpha: AUTO_ALPHA_VISIBLE,
    duration: REVEAL_DURATION,
    ease: "power2.out",
    overwrite: true,
    stagger: REVEAL_STAGGER,
    y: REVEAL_Y_RESET,
  })
}

const setupScrollReveals = (root: HTMLElement): void => {
  const revealElementsList = gsap.utils.toArray<HTMLElement>(".reveal", root).filter((element) => startsBelowTheFold(element))
  if (revealElementsList.length === 0) {
    return
  }
  gsap.set(revealElementsList, {
    autoAlpha: AUTO_ALPHA_HIDDEN,
    y: REVEAL_OFFSET_Y,
  })
  ScrollTrigger.batch(revealElementsList, {
    onEnter: (batch) => {
      const elements = batch.filter((element): element is HTMLElement => element instanceof HTMLElement)
      animateRevealElements(elements)
    },
    once: true,
    start: SCROLL_TRIGGER_BATCH_START,
  })
}

export const useProductAnimations = ({ dependencies = [], rootRef }: ProductAnimationsProps) => {
  useGSAP(
    () => {
      const root = rootRef.current
      if (root === null) {
        return
      }

      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setupScrollReveals(root)
        gsap.utils.toArray<HTMLElement>(".parallax-wrap", root).forEach((wrap) => {
          const img = wrap.querySelector(".parallax-img")
          if (img === null) {
            return
          }
          gsap.fromTo(
            img,
            {
              yPercent: -4,
            },
            {
              ease: "none",
              scrollTrigger: {
                end: "bottom top",
                scrub: true,
                start: "top bottom",
                trigger: wrap,
              },
              yPercent: 4,
            },
          )
        })
      })
    },
    {
      dependencies,
      scope: rootRef,
    },
  )
}

const AUTO_ALPHA_HIDDEN = 0

const AUTO_ALPHA_VISIBLE = 1

const REVEAL_DURATION = 0.7

const REVEAL_OFFSET_Y = 24

const REVEAL_STAGGER = 0.08

const REVEAL_Y_RESET = 0

const SCROLL_TRIGGER_BATCH_START = "top 92%"

interface ProductAnimationsProps {
  readonly dependencies?: unknown[]
  readonly rootRef: RefObject<HTMLElement | null>
}
