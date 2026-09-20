import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { SOCIALS } from "~/src/presentation/branding/socials"
export const MenuFooter = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const linkStyles =
    "font-light text-primary-foreground/70 text-xs uppercase tracking-[0.15em] transition-colors duration-300 ease-out hover:text-primary-foreground"
  return (
    <div data-menu-footer className="mx-auto mt-auto flex w-full max-w-400 flex-row items-end justify-between px-6 pb-8 lg:px-12">
      <p className="text-xs font-light tracking-widest text-primary-foreground/50 uppercase">{t("menu.footer.tagline")}</p>
      <div className="flex gap-8">
        <a className={linkStyles} href={SOCIALS.INSTAGRAM} rel="noopener noreferrer" target="_blank">
          {t("menu.footer.instagram")}
        </a>
        <a className={cn(linkStyles, "hidden sm:block")} href={SOCIALS.FACEBOOK} rel="noopener noreferrer" target="_blank">
          {t("menu.footer.facebook")}
        </a>
      </div>
    </div>
  )
}
