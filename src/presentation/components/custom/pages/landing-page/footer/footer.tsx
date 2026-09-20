import { type JSX, type ReactNode, type SVGProps } from "react"

import { useTranslations } from "use-intl"

import { SOCIALS } from "~/src/presentation/branding/socials"

import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"
export const Footer = (): JSX.Element => {
  const t = useTranslations("components.custom.footer")
  return (
    <footer className="relative z-10 bg-primary py-16 text-primary-foreground md:py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="flex flex-col space-y-4 lg:col-span-2 lg:pr-12">
            <h2 className="font-serif text-3xl tracking-tight">{t("brand")}</h2>
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">{t("description")}</p>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="mb-2 text-xs font-medium tracking-widest text-primary-foreground/50 uppercase">{t("info")}</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink to={ROUTES.ABOUT}>{t("about")}</FooterLink>
              <FooterLink to={ROUTES.ABOUT}>{t("contact")}</FooterLink>
              <FooterLink to={ROUTES.ACCOUNT}>{t("account")}</FooterLink>
            </ul>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="mb-2 text-xs font-medium tracking-widest text-primary-foreground/50 uppercase">{t("legal")}</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink to={ROUTES.TERMS_OF_SERVICE}>{t("terms")}</FooterLink>
              <FooterLink to={ROUTES.PRIVACY_POLICY}>{t("privacy")}</FooterLink>
              <FooterLink to={ROUTES.EXCHANGES_AND_RETURNS}>{t("returns")}</FooterLink>
            </ul>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="mb-2 text-xs font-medium tracking-widest text-primary-foreground/50 uppercase">{t("tips")}</h3>
            <ul className="space-y-3 text-sm">
              <FooterLink to={ROUTES.FAQ}>{t("care")}</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-primary-foreground/10 pt-8 md:mt-24 md:flex-row">
          <p className="text-xs text-primary-foreground/50">{t("copyright")}</p>

          <div className="flex items-center space-x-6">
            <a
              href={SOCIALS.INSTAGRAM}
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary-foreground/50 transition-colors hover:text-primary-foreground"
              aria-label={t("instagram")}
            >
              <InstagramIcon title={t("instagram")} className="h-5 w-5" />
            </a>
            <a
              href={SOCIALS.FACEBOOK}
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary-foreground/50 transition-colors hover:text-primary-foreground"
              aria-label={t("facebook")}
            >
              <FacebookIcon title={t("facebook")} className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
const FooterLink = ({ to, children }: { to: LocalizedTo; children: ReactNode }) => (
  <li>
    <LocalizedLink to={to} className="text-primary-foreground/80 transition-colors hover:text-primary-foreground">
      {children}
    </LocalizedLink>
  </li>
)
const FacebookIcon = (
  props: SVGProps<SVGSVGElement> & {
    title: string
  },
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <title>{props.title}</title>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)
const InstagramIcon = (
  props: SVGProps<SVGSVGElement> & {
    title: string
  },
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <title>{props.title}</title>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)
