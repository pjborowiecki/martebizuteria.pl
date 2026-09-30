import { type ComponentType, type JSX, type SVGProps, useCallback } from "react"

import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { useOAuthSignIn } from "~/src/presentation/components/custom/pages/auth/hooks/use-oauth-sign-in"

export const OAuthButton = ({ Icon, label, provider }: Readonly<OAuthButtonProps>): JSX.Element => {
  const t = useTranslations()
  const { isPending, mutate } = useOAuthSignIn()
  const handleOAuth = useCallback(() => {
    mutate(provider)
  }, [mutate, provider])

  return (
    <Button
      type="button"
      variant="outline"
      size="xl"
      disabled={isPending}
      onClick={handleOAuth}
      id={`oauth-button-${provider}`}
      aria-label={t(`pages.auth.oauth.${provider}`)}
      className="w-full gap-3 border-border/50 bg-muted text-sm hover:border-border hover:bg-background md:text-sm dark:bg-input/50 dark:hover:bg-input/30"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
    </Button>
  )
}

type Provider = "google" | "github"

interface OAuthButtonProps {
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>
  readonly label: string
  readonly provider: Provider
}
