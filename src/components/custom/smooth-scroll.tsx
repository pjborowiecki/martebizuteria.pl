import { type ReactNode, useEffect, useRef } from "react";

import Lenis from "lenis";

import { ScrollTrigger, gsap } from "~/src/lib/gsap";
import { setLenisInstance } from "~/src/lib/lenis/lenis-instance";

import { useLenisRouterScrollSync } from "~/src/hooks/use-lenis-router-scroll-sync";

const MS_PER_S = 1000;
const ZERO_LAG = 0;
const SCROLLER_PROXY_SCROLL_TOP_ARG_COUNT = 1;

function setupLenisScrollTriggerProxy(lenis: Lenis): () => void {
  ScrollTrigger.scrollerProxy(document.documentElement, {
    getBoundingClientRect() {
      return {
        height: window.innerHeight,
        left: 0,
        top: 0,
        width: document.documentElement.clientWidth
      };
    },
    pinType: "transform",
    scrollTop(value) {
      if (arguments.length >= SCROLLER_PROXY_SCROLL_TOP_ARG_COUNT && typeof value === "number") {
        lenis.scrollTo(value, { immediate: true });
      }

      return lenis.scroll;
    }
  });

  lenis.on("scroll", () => {
    ScrollTrigger.update();
  });

  const handleRefresh = () => {
    lenis.resize();
  };

  ScrollTrigger.addEventListener("refresh", handleRefresh);

  return () => {
    ScrollTrigger.removeEventListener("refresh", handleRefresh);
    ScrollTrigger.scrollerProxy(document.documentElement, {});
  };
}

export function SmoothScroll({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const lenisRef = useRef<Lenis | undefined>(globalThis.undefined);

  useLenisRouterScrollSync();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.09,
      touchMultiplier: 2,
      wheelMultiplier: 1
    });
    lenisRef.current = lenis;
    setLenisInstance(lenis);

    const clearScrollTriggerProxy = setupLenisScrollTriggerProxy(lenis);

    const raf = (time: number) => {
      lenis.raf(time * MS_PER_S);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(ZERO_LAG);

    const GSAP_IMMEDIATE_DELAY = 0;

    gsap.delayedCall(GSAP_IMMEDIATE_DELAY, () => {
      ScrollTrigger.refresh();
    });

    return () => {
      gsap.ticker.remove(raf);
      clearScrollTriggerProxy();
      lenis.destroy();
      lenisRef.current = globalThis.undefined;
      setLenisInstance(undefined);
    };
  }, []);

  return children;
}
