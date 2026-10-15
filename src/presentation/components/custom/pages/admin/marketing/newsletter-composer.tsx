import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { FlaskConical, Loader2, Send } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getNewsletterStatsQuery } from "~/src/modules/newsletter/use-cases/get-newsletter-stats"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import {
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
  ADMIN_HEADER_SECONDARY_BUTTON_CLASS,
  ADMIN_PAGE_BODY_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { ContentPageLeaveDialog } from "~/src/presentation/components/custom/pages/admin/content/content-page-leave-dialog"
import { ContentPageLocaleTabs } from "~/src/presentation/components/custom/pages/admin/content/content-page-locale-tabs"
import {
  localesWithErrors,
  useNewsletterComposer,
} from "~/src/presentation/components/custom/pages/admin/marketing/hooks/use-newsletter-composer"
import { NewsletterComposerFields } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-composer-fields"
import { NewsletterSendDialog } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-send-dialog"

import { ROUTES } from "~/src/routes"

export const NewsletterComposer = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const {
    data: { confirmed },
  } = useSuspenseQuery(getNewsletterStatsQuery())
  const composer = useNewsletterComposer()
  const breadcrumbs = useMemo(
    () => [
      { href: ROUTES.ADMIN, label: t("nav.dashboard") },
      { href: ROUTES.ADMIN_MARKETING, label: t("marketing.title") },
    ],
    [t],
  )

  const actions = (
    <>
      <span className="hidden text-[13px] text-sidebar-foreground/60 max-lg:whitespace-nowrap md:inline">
        {t("marketing.composer.recipients", { count: confirmed })}
      </span>
      <Button
        className={ADMIN_HEADER_SECONDARY_BUTTON_CLASS}
        disabled={composer.isTesting}
        onClick={() => {
          void composer.sendTest()
        }}
        size="sm"
        variant="outline"
      >
        {composer.isTesting ? (
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        ) : (
          <FlaskConical className="size-3.5" strokeWidth={1.5} />
        )}
        {t("marketing.composer.actions.sendTest")}
      </Button>
      <Button
        className={cn(ADMIN_HEADER_PRIMARY_BUTTON_CLASS, "disabled:opacity-50")}
        disabled={confirmed === 0}
        onClick={() => {
          void composer.requestDelivery()
        }}
        size="sm"
      >
        <Send className="size-3.5" strokeWidth={1.5} />
        {t("marketing.composer.actions.send")}
      </Button>
    </>
  )

  return (
    <>
      <AdminHeader
        actions={actions}
        backHref={ROUTES.ADMIN_MARKETING}
        breadcrumbs={breadcrumbs}
        description={t("marketing.composer.description")}
        title={t("marketing.composer.title")}
      />

      <div className={ADMIN_PAGE_BODY_CLASS}>
        <ContentPageLocaleTabs
          invalidLocales={localesWithErrors(composer.form.formState.errors)}
          locale={composer.activeLocale}
          onLocaleChange={composer.setActiveLocale}
        >
          <NewsletterComposerFields form={composer.form} key={composer.activeLocale} locale={composer.activeLocale} />
        </ContentPageLocaleTabs>
      </div>

      <NewsletterSendDialog
        isPending={composer.isDelivering}
        onConfirm={() => {
          void composer.confirmDelivery()
        }}
        onOpenChange={composer.setConfirmOpen}
        open={composer.confirmOpen}
        recipientCount={confirmed}
      />
      <ContentPageLeaveDialog
        onLeave={composer.leaveGuard.proceed}
        onStay={composer.leaveGuard.reset}
        open={composer.leaveGuard.status === "blocked"}
      />
    </>
  )
}
