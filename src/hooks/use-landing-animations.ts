import { type RefObject } from "react"

import { ScrollTrigger, gsap, useGSAP } from "~/src/integrations/gsap/gsap.config"

const startsBelowTheFold = (element: HTMLElement): boolean => element.getBoundingClientRect().top >= window.innerHeight

const animateRevealElements = (elements: readonly HTMLElement[]): void => {
  gsap.to(elements, {
    autoAlpha: 1,
    duration: REVEAL_DURATION,
    ease: "power2.out",
    overwrite: true,
    stagger: REVEAL_STAGGER,
    y: 0,
  })
}

const setupScrollReveals = (root: HTMLElement): void => {
  const revealElementsList = gsap.utils.toArray<HTMLElement>(".reveal", root).filter((element) => startsBelowTheFold(element))
  if (revealElementsList.length === 0) {
    return
  }
  gsap.set(revealElementsList, {
    autoAlpha: 0,
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

const setupLineReveals = (root: HTMLElement): void => {
  gsap.utils.toArray<HTMLElement>(".line-reveal", root).forEach((line) => {
    if (!startsBelowTheFold(line)) {
      return
    }
    gsap.fromTo(
      line,
      {
        scaleX: 0,
        transformOrigin: "left center",
      },
      {
        duration: LINE_REVEAL_DURATION,
        ease: "power2.out",
        scaleX: 1,
        scrollTrigger: {
          once: true,
          start: SCROLL_TRIGGER_LINE_START,
          trigger: line,
        },
      },
    )
  })
}

const setupParallax = (root: HTMLElement): void => {
  gsap.utils.toArray<HTMLElement>(".parallax-wrap", root).forEach((wrap) => {
    const img = wrap.querySelector(".parallax-img")
    if (img === null) {
      return
    }
    gsap.fromTo(
      img,
      {
        yPercent: PARALLAX_Y_PERCENT_START,
      },
      {
        ease: "none",
        scrollTrigger: {
          end: "bottom top",
          scrub: true,
          start: "top bottom",
          trigger: wrap,
        },
        yPercent: PARALLAX_Y_PERCENT_END,
      },
    )
  })
}

export const useLandingAnimations = ({ rootRef }: LandingAnimationsProps) => {
  useGSAP(
    () => {
      const root = rootRef.current
      if (root === null) {
        return
      }

      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        setupScrollReveals(root)
        setupLineReveals(root)
        setupParallax(root)
        gsap.delayedCall(0, () => {
          ScrollTrigger.refresh()
        })
      })

      return () => {
        mm.revert()
      }
    },
    {
      scope: rootRef,
    },
  )
}

const LINE_REVEAL_DURATION = 1

const PARALLAX_Y_PERCENT_END = 6

const PARALLAX_Y_PERCENT_START = -6

const REVEAL_DURATION = 0.9

const REVEAL_OFFSET_Y = 28

const REVEAL_STAGGER = 0.08

const SCROLL_TRIGGER_BATCH_START = "top 92%"

const SCROLL_TRIGGER_LINE_START = "top 92%"

interface LandingAnimationsProps {
  rootRef: RefObject<HTMLDivElement | null>
}
