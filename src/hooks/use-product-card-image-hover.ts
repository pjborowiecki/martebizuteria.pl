import { type RefObject, useRef } from "react"

import { gsap, useGSAP } from "~/src/lib/gsap"
export const useProductCardImageHover = (imageLayerRef: RefObject<HTMLDivElement | null>): ProductCardImageHoverHandlers => {
  const canAnimateRef = useRef(true)
  const { contextSafe } = useGSAP(
    () => {
      const layer = imageLayerRef.current
      if (layer === null) {
        return
      }
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        canAnimateRef.current = true
        gsap.set(layer, {
          scale: 1,
          transformOrigin: TRANSFORM_ORIGIN,
        })
      })
      mm.add("(prefers-reduced-motion: reduce)", () => {
        canAnimateRef.current = false
        gsap.set(layer, {
          scale: 1,
          transformOrigin: TRANSFORM_ORIGIN,
        })
      })
      return () => {
        mm.revert()
      }
    },
    {
      revertOnUpdate: true,
      scope: imageLayerRef,
    },
  )
  const handleMouseEnter = contextSafe(() => {
    const layer = imageLayerRef.current
    if (layer === null || !canAnimateRef.current) {
      return
    }
    gsap.to(layer, {
      duration: HOVER_IN_DURATION,
      ease: HOVER_EASE,
      overwrite: "auto",
      scale: HOVER_SCALE,
    })
  })
  const handleMouseLeave = contextSafe(() => {
    const layer = imageLayerRef.current
    if (layer === null) {
      return
    }
    if (!canAnimateRef.current) {
      gsap.set(layer, {
        scale: 1,
      })
      return
    }
    gsap.to(layer, {
      duration: HOVER_OUT_DURATION,
      ease: HOVER_EASE,
      overwrite: "auto",
      scale: 1,
    })
  })
  return {
    handleMouseEnter,
    handleMouseLeave,
  }
}
const HOVER_SCALE = 1.03
const HOVER_IN_DURATION = 0.55
const HOVER_OUT_DURATION = 0.7
const HOVER_EASE = "power3.out"
const TRANSFORM_ORIGIN = "center center"
interface ProductCardImageHoverHandlers {
  readonly handleMouseEnter: () => void
  readonly handleMouseLeave: () => void
}
