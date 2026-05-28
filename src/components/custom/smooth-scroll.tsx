import { type ReactNode, useEffect, useRef } from "react";

import Lenis from "lenis";

import { ScrollTrigger, gsap } from "~/src/lib/gsap";

const MS_PER_S = 1000;
const ZERO_LAG = 0;

export function SmoothScroll({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const lenisRef = useRef<Lenis | undefined>(globalThis.undefined);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.09,
      touchMultiplier: 2,
      wheelMultiplier: 1
    });
    lenisRef.current = lenis;

    lenis.on("scroll", () => {
      ScrollTrigger.update();
    });

    const raf = (time: number) => {
      lenis.raf(time * MS_PER_S);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(ZERO_LAG);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = globalThis.undefined;
    };
  }, []);

  return children;
}
