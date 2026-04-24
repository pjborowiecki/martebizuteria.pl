import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof globalThis !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollToPlugin, ScrollTrigger);
  gsap.defaults({ duration: 0.8, ease: "power3.out" });
}

export { gsap } from "gsap";
export { useGSAP } from "@gsap/react";
export { ScrollTrigger } from "gsap/ScrollTrigger";
export { ScrollToPlugin } from "gsap/ScrollToPlugin";
