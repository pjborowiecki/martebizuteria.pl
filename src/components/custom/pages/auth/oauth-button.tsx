import { type ComponentType, type JSX, type SVGProps, useCallback, useTransition } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { authClient } from "~/src/integrations/better-auth/auth._client";
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.utils";

import { buildLocalizedUrl } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

type Provider = "google" | "github";

interface OAuthButtonProps {
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly label: string;
  readonly provider: Provider;
}

export function OAuthButton({ Icon, label, provider }: Readonly<OAuthButtonProps>): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const t = useTranslations();
  const locale = useLocale();

  const handleOAuth = useCallback(() => {
    startTransition(async () => {
      await authClient.signIn.social({
        callbackURL: buildLocalizedUrl("", CONSTANTS.ROUTES.ACCOUNT_OVERVIEW, locale),
        fetchOptions: {
          onError: (ctx) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error)
            });
          },
          onSuccess: () => {
            toast.success(t("pages.auth.toast.signInTitle"), {
              description: t("pages.auth.toast.signInDescription")
            });
          }
        },
        provider
      });
    });
  }, [locale, provider, t]);

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
  );
}
