import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof document !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
  gsap.defaults({ duration: 0.8, ease: "power3.out" })
}

export const gsapToolkit = { ScrollTrigger, gsap }
