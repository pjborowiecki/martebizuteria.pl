import { type JSX } from "react"

import { useLocation } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { getAssetURL } from "~/src/lib/url"

import { Image } from "~/src/presentation/components/custom/image"
export const AuthEditorial = (): JSX.Element => {
  const t = useTranslations("components.custom.authLayout")
  const location = useLocation()
  const isSignUp = location.pathname.includes("sign-up")
  const image = getAssetURL(isSignUp ? "marketing/about.webp" : "marketing/hero.webp")
  const width = isSignUp ? SIGN_UP_IMAGE_WIDTH : SIGN_IN_IMAGE_WIDTH
  const height = isSignUp ? SIGN_UP_IMAGE_HEIGHT : SIGN_IN_IMAGE_HEIGHT
  return (
    <div className="relative hidden overflow-hidden bg-secondary lg:block">
      <Image
        alt={t("imageAlt")}
        className="absolute inset-0 size-full object-cover object-[center_30%] transition-opacity duration-500"
        height={height}
        priority
        sizes="(max-width: 1024px) 0px, 50vw"
        src={image}
        width={width}
      />
      <div className="absolute inset-0 bg-white/20" />
      <div className="absolute inset-x-8 bottom-8 xl:inset-x-12 xl:bottom-12">
        <p className="font-serif text-2xl leading-relaxed text-black xl:text-3xl">{t("imageQuote")}</p>
        <div className="mt-6 h-px w-8 bg-black/40" />
        <p className="mt-6 text-[10px] tracking-[0.25em] text-black/70 uppercase">{t("imageAttribution")}</p>
      </div>
    </div>
  )
}
const SIGN_UP_IMAGE_WIDTH = 1600
const SIGN_UP_IMAGE_HEIGHT = 1100
const SIGN_IN_IMAGE_WIDTH = 1280
const SIGN_IN_IMAGE_HEIGHT = 1600
