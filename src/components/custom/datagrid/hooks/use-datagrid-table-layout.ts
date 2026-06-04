import { type RefObject, useLayoutEffect, useState } from "react";

const UNMEASURED_CONTAINER_WIDTH = 0;

/** Scroll container width — used to size the flex-fill column in px. */
export function useDatagridContainerWidth(containerRef: RefObject<HTMLElement | null>, layoutKey: number): number {
  const [clientWidth, setClientWidth] = useState(UNMEASURED_CONTAINER_WIDTH);

  useLayoutEffect(
    function observeDatagridContainerWidth() {
      const scrollContainer = containerRef.current;
      if (scrollContainer === null) {
        return;
      }

      const element = scrollContainer;

      function updateWidth(): void {
        const nextWidth = element.clientWidth;
        setClientWidth((previous) => (previous === nextWidth ? previous : nextWidth));
      }

      updateWidth();

      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    },
    [containerRef, layoutKey]
  );

  return clientWidth;
}
