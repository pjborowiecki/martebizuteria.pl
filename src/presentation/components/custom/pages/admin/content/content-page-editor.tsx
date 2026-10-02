import { type JSX, useMemo } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"
import { ContentPageEditorActions } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor-actions"
import { CONTENT_PAGE_FORM_ID, localesWithErrors } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"
import { ContentPageFields } from "~/src/presentation/components/custom/pages/admin/content/content-page-fields"
import { ContentPageLeaveDialog } from "~/src/presentation/components/custom/pages/admin/content/content-page-leave-dialog"
import { ContentPageLocaleTabs } from "~/src/presentation/components/custom/pages/admin/content/content-page-locale-tabs"
import { useContentPageEditor } from "~/src/presentation/components/custom/pages/admin/content/hooks/use-content-page-editor"

import { ROUTES } from "~/src/routes"

export const ContentPageEditor = ({ handle }: Readonly<{ handle: ContentPageHandle }>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const uiLocale = useLocale()
  const { activeLocale, form, isPending, leaveGuard, page, revision, saveOnShortcut, setActiveLocale, submit } =
    useContentPageEditor(handle)
  const breadcrumbs = useMemo(
    () => [
      { href: ROUTES.ADMIN, label: t("nav.dashboard") },
      { href: ROUTES.ADMIN_CONTENT, label: t("content.title") },
    ],
    [t],
  )

  const actions = <ContentPageEditorActions control={form.control} handle={handle} isPending={isPending} locale={activeLocale} />

  return (
    <div className="contents" onKeyDown={saveOnShortcut}>
      <AdminHeader
        actions={actions}
        backHref={ROUTES.ADMIN_CONTENT}
        breadcrumbs={breadcrumbs}
        title={resolveLocalizedString(page.titles, uiLocale)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        <form className="mx-auto max-w-3xl" id={CONTENT_PAGE_FORM_ID} noValidate onSubmit={submit}>
          <ContentPageLocaleTabs
            invalidLocales={localesWithErrors(form.formState.errors)}
            locale={activeLocale}
            onLocaleChange={setActiveLocale}
          >
            <ContentPageFields key={`${activeLocale}-${String(revision)}`} form={form} locale={activeLocale} />
          </ContentPageLocaleTabs>
        </form>
      </div>

      <ContentPageLeaveDialog onLeave={leaveGuard.proceed} onStay={leaveGuard.reset} open={leaveGuard.status === "blocked"} />
    </div>
  )
}
