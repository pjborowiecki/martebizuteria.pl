import { useEffect, useRef, useState } from "react"

import { cn } from "cn"

import { gsap, useGSAP } from "~/src/lib/gsap"
export const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  useGSAP(() => {
    const isFinePointer = typeof document !== "undefined" && globalThis.matchMedia("(pointer: fine)").matches
    if (!isFinePointer) {
      return
    }
    const cursorX = gsap.quickTo(cursorRef.current, "x", {
      duration: 0.04,
      ease: "power3.out",
    })
    const cursorY = gsap.quickTo(cursorRef.current, "y", {
      duration: 0.04,
      ease: "power3.out",
    })
    let hasMoved = false
    const onMouseMove = (event: MouseEvent) => {
      if (!hasMoved) {
        hasMoved = true
        gsap.set(cursorRef.current, {
          autoAlpha: 1,
        })
      }
      cursorX(event.clientX)
      cursorY(event.clientY)
    }
    globalThis.addEventListener("mousemove", onMouseMove)
    return () => {
      globalThis.removeEventListener("mousemove", onMouseMove)
    }
  }, [])
  useEffect(() => {
    const isFinePointer = typeof document !== "undefined" && globalThis.matchMedia("(pointer: fine)").matches
    if (!isFinePointer) {
      return
    }
    const handleMouseOver = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("a, button, input, textarea, select, [role='button'], .hover-target, summary")
      ) {
        setIsHovering(true)
      }
    }
    const handleMouseOut = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("a, button, input, textarea, select, [role='button'], .hover-target, summary")
      ) {
        setIsHovering(false)
      }
    }
    document.addEventListener("mouseover", handleMouseOver)
    document.addEventListener("mouseout", handleMouseOut)
    return () => {
      document.removeEventListener("mouseover", handleMouseOver)
      document.removeEventListener("mouseout", handleMouseOut)
    }
  }, [])
  return (
    <div
      ref={cursorRef}
      className={cn(
        "pointer-events-none invisible fixed top-0 left-0 z-9999 -mt-2 -ml-2 flex h-4 w-4 items-center justify-center rounded-full opacity-0 mix-blend-difference transition-all duration-150 ease-out will-change-transform",
        {
          "scale-100 bg-white": !isHovering,
          "scale-[2.5] bg-white/20 backdrop-blur-md": isHovering,
        },
      )}
    />
  )
}
