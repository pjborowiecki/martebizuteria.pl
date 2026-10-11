import { type JSX, useCallback } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { useTranslations } from "use-intl/react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { getCustomerProfileQuery } from "~/src/modules/customer-account/use-cases/get-customer-profile"

import { useAdminLightTheme } from "~/src/presentation/theme/use-admin-light-theme"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { SecuritySection } from "~/src/presentation/components/custom/pages/account/profile/sections/security-section"

import { ROUTES } from "~/src/routes"

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

export const AdminSecurityPage = (): JSX.Element => {
  const t = useTranslations("pages.admin")
  const router = useRouter()
  const { data: profile } = useSuspenseQuery(getCustomerProfileQuery())
  useAdminLightTheme()

  const handleSignOut = useCallback(() => {
    void signOutRequest({
      fetchOptions: {
        onSuccess: () => {
          globalThis.location.href = router.buildLocation({ to: ROUTES.AUTH_SIGN_IN }).publicHref
        },
      },
    })
  }, [router])

  return (
    <main className="min-h-svh bg-background font-light">
      <div className="mx-auto w-full max-w-2xl px-6 py-16 lg:py-24">
        <div className="mb-10 space-y-3">
          <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("security.eyebrow")}</p>
          <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("security.title")}</h1>
          <p className="text-[14px] text-muted-foreground">{profile.twoFactorEnabled ? t("security.enabled") : t("security.required")}</p>
        </div>

        {profile.hasPassword ? (
          <SecuritySection twoFactorEnabled={profile.twoFactorEnabled} />
        ) : (
          <p className="text-[14px]">{t("security.passwordRequired")}</p>
        )}

        <Separator className="my-10" />

        <div className="flex flex-wrap items-center gap-4">
          {profile.twoFactorEnabled && (
            <LocalizedLink className={buttonVariants({ size: "account", variant: "account" })} to={ROUTES.ADMIN_OVERVIEW}>
              {t("security.openAdmin")}
            </LocalizedLink>
          )}
          <Button onClick={handleSignOut} size="account" variant="account-outline">
            {t("user.signOut")}
          </Button>
        </div>
      </div>
    </main>
  )
}
