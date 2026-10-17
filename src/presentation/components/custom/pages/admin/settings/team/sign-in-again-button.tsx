import { type JSX, useCallback } from "react"

import { useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { LogIn } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { signOut } from "~/src/integrations/better-auth/auth.client"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ROUTES } from "~/src/routes"

const signOutRequest = createClientOnlyFn((input: Parameters<typeof signOut>[0]) => signOut(input))

export const SignInAgainButton = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.admins")
  const router = useRouter()

  const signInAgain = useCallback(() => {
    void signOutRequest({
      fetchOptions: {
        onSuccess: () => {
          const redirect = router.buildLocation({ to: ROUTES.ADMIN_SETTINGS_TEAM }).publicHref
          globalThis.location.href = router.buildLocation({ search: { redirect }, to: ROUTES.AUTH_SIGN_IN }).publicHref
        },
      },
    })
  }, [router])

  return (
    <Button className="shrink-0 gap-1.5" onClick={signInAgain} size="sm" type="button" variant="outline">
      <LogIn className="size-3.5" strokeWidth={1.5} />
      {t("signInAgain")}
    </Button>
  )
}
