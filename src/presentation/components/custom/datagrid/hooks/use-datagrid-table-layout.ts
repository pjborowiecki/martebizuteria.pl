import { type RefObject, useLayoutEffect, useState } from "react"

/** Scroll container width — used to size the flex-fill column in px. */
export const useDatagridContainerWidth = (containerRef: RefObject<HTMLElement | null>, layoutKey: number): number => {
  const [clientWidth, setClientWidth] = useState(0)

  useLayoutEffect(() => {
    const scrollContainer = containerRef.current
    if (scrollContainer === null) {
      return
    }

    const element = scrollContainer

    const updateWidth = (): void => {
      const nextWidth = element.clientWidth
      setClientWidth((previous) => (previous === nextWidth ? previous : nextWidth))
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [containerRef, layoutKey])

  return clientWidth
}
