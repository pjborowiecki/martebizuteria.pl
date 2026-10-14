const VISIBLE_WIDTH_PX = 100

export const markAsCut = <TElement extends HTMLElement>(element: TElement): TElement => {
  Object.defineProperty(element, "clientWidth", { configurable: true, value: VISIBLE_WIDTH_PX })
  Object.defineProperty(element, "scrollWidth", { configurable: true, value: VISIBLE_WIDTH_PX + 1 })

  return element
}
