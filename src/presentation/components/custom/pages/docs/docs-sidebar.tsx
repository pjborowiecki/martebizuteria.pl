import { type JSX, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { type DocsNavigationLink, type DocsNavigationSection } from "~/src/integrations/fumadocs/fumadocs.docs"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const ACTIVE_PROPS = {
  className:
    "bg-muted/50 font-medium text-foreground before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-r-md before:bg-foreground",
}

const INACTIVE_PROPS = {
  className: "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
}

const EXACT_MATCH = {
  exact: true,
} as const

const LINK_CLASS_NAME = "relative flex items-center rounded-md px-3 py-1.5 text-[13px] tracking-[0.02em] transition-colors"

const DocsSidebarLink = ({ link }: Readonly<{ link: DocsNavigationLink }>): JSX.Element => {
  const params = useMemo(() => ({ _splat: link.splat }), [link.splat])

  return (
    <li>
      <LocalizedLink
        activeOptions={EXACT_MATCH}
        activeProps={ACTIVE_PROPS}
        className={LINK_CLASS_NAME}
        inactiveProps={INACTIVE_PROPS}
        params={params}
        to={ROUTES.DOCS_PAGE}
      >
        {link.title}
      </LocalizedLink>
    </li>
  )
}

export const DocsSidebar = ({ sections }: Readonly<{ sections: readonly DocsNavigationSection[] }>): JSX.Element => {
  const t = useTranslations("pages.docs")

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <h2 className="px-2 text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("navigation.title")}</h2>
      <Separator className="mt-4" />

      <nav aria-label={t("navigation.label")} className="mt-4 flex flex-col gap-6">
        <ul className="flex flex-col gap-0.5">
          <li>
            <LocalizedLink
              activeOptions={EXACT_MATCH}
              activeProps={ACTIVE_PROPS}
              className={LINK_CLASS_NAME}
              inactiveProps={INACTIVE_PROPS}
              to={ROUTES.DOCS}
            >
              {t("navigation.overview")}
            </LocalizedLink>
          </li>
        </ul>

        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-medium tracking-[0.18em] text-muted-foreground/70 uppercase">{section.title}</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {section.links.map((link) => (
                <DocsSidebarLink key={link.splat} link={link} />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
