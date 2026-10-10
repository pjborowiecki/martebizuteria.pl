import { type JSX, useCallback } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { TURNSTILE_ACTIONS } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

import { useTurnstileToken } from "~/src/hooks/use-turnstile-token"

import { Button } from "~/src/presentation/components/shadcn/button"

import { useResendVerification } from "~/src/presentation/components/custom/pages/auth/hooks/use-resend-verification"

export const UnverifiedEmailNotice = ({ email }: Readonly<UnverifiedEmailNoticeProps>): JSX.Element => {
  const t = useTranslations("pages.auth.sign-in.unverified")
  const { containerRef, requestToken } = useTurnstileToken(TURNSTILE_ACTIONS.VERIFICATION_RESEND)
  const { isPending, mutate } = useResendVerification(requestToken)

  const resend = useCallback(() => {
    mutate(email)
  }, [email, mutate])

  return (
    <div className="space-y-3 rounded-lg border border-border p-4 text-center">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div ref={containerRef} className="empty:hidden" />
      <Button className="w-full gap-2.5 tracking-wide" disabled={isPending} onClick={resend} size="lg" type="button" variant="outline">
        {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isPending ? t("resending") : t("resend")}
      </Button>
    </div>
  )
}

interface UnverifiedEmailNoticeProps {
  readonly email: string
}
