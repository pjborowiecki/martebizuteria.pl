import { type JSX, useRef, useState } from "react"

import { noop } from "@tanstack/react-query"
import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { useGsap } from "~/src/hooks/use-gsap"

import { LANDING_VIDEO_POSTER, LANDING_VIDEO_SRC } from "~/src/data/landing"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const playWhileOnScreen = (video: HTMLVideoElement | null): (() => void) | undefined => {
  if (video === null || globalThis.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting !== true) {
        video.pause()
        return
      }

      video.play().catch(noop)
    },
    { threshold: VISIBLE_FRACTION },
  )
  observer.observe(video)

  return () => {
    observer.disconnect()
  }
}

export const VideoExperienceSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.videoExperienceSection")
  const sectionRef = useRef<HTMLElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  useGsap(
    ({ gsap }) => {
      const section = sectionRef.current
      if (!section) {
        return
      }
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(section, {
          ease: "none",
          scrollTrigger: { end: "bottom top", scrub: true, start: "top top", trigger: section },
          yPercent: 25,
        })
      })
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="video-section relative z-0 flex min-h-svh items-end overflow-hidden bg-primary text-white"
    >
      <div className="absolute inset-0">
        <video
          ref={playWhileOnScreen}
          aria-label={t("videoLabel")}
          className="h-full w-full object-cover"
          height={VIDEO_HEIGHT}
          muted
          loop
          onError={() => {
            setIsPlaying(false)
          }}
          onPlaying={() => {
            setIsPlaying(true)
          }}
          playsInline
          preload="auto"
          src={LANDING_VIDEO_SRC}
          width={VIDEO_WIDTH}
        />
        <Image
          alt=""
          className={cn("pointer-events-none absolute inset-0 size-full object-cover", { invisible: isPlaying })}
          height={VIDEO_HEIGHT}
          sizes="100vw"
          src={LANDING_VIDEO_POSTER}
          width={VIDEO_WIDTH}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/35 via-transparent to-black/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(58%,520px)] bg-linear-to-t from-black/55 via-black/20 to-transparent" />

      <div className="relative z-10 storefront-container flex w-full flex-col gap-12 pt-44 pb-40 sm:gap-14 sm:pt-52 sm:pb-44 lg:ml-0 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:pt-64 lg:pb-52 xl:pb-56">
        <div className="max-w-4xl space-y-5 sm:space-y-6 lg:space-y-7">
          <p className="reveal text-[11px] tracking-[0.28em] text-white/85 uppercase drop-shadow-[0_1px_12px_rgba(0,0,0,0.55)]">
            {t("eyebrow")}
          </p>
          <h2 className="reveal font-serif leading-[0.92] text-white [text-shadow:0_4px_48px_rgba(0,0,0,0.55)]">
            <span className="block text-4xl sm:text-6xl md:text-8xl lg:text-8xl xl:text-9xl">{t("titleLine1")}</span>
            <span className="mt-2 block pl-2 text-4xl italic sm:pl-4 sm:text-6xl md:mt-3 md:pl-6 md:text-8xl lg:mt-4 lg:pl-10 lg:text-8xl xl:pl-12 xl:text-9xl">
              {t("titleLine2")}
            </span>
          </h2>
          <p className="reveal max-w-xl text-base/relaxed text-white/85 [text-shadow:0_1px_24px_rgba(0,0,0,0.45)] md:text-lg/relaxed lg:text-xl/relaxed">
            {t("description")}
          </p>
        </div>

        <div className="reveal flex shrink-0 flex-col gap-3 self-stretch pb-[env(safe-area-inset-bottom)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 sm:self-end lg:self-auto lg:pb-0">
          <LocalizedLink
            to={ROUTES.COLLECTIONS}
            className="inline-flex min-h-12 items-center justify-center rounded-none bg-white px-6 py-3 text-center text-sm font-medium tracking-wide text-black transition-colors hover:bg-white/90 sm:min-w-[11rem] sm:px-8"
          >
            {t("ctaPrimary")}
          </LocalizedLink>
          <LocalizedLink
            to={ROUTES.PRODUCTS}
            className="inline-flex min-h-12 items-center justify-center rounded-none border border-white/50 bg-white/5 px-6 py-3 text-center text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/15 sm:min-w-[11rem] sm:px-8"
          >
            {t("ctaSecondary")}
          </LocalizedLink>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-white/15" />
    </section>
  )
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

const VIDEO_HEIGHT = 1080

const VIDEO_WIDTH = 1920

const VISIBLE_FRACTION = 0.25
