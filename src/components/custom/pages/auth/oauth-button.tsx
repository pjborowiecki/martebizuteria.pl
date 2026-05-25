import { type ComponentType, type JSX, type SVGProps, useCallback, useTransition } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { authClient } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";

import { Button } from "~/src/components/shadcn/button";

type Provider = "google" | "github";

function getAuthErrorKey(errorCode: string): string {
  return (AUTH_ERRORS as Record<string, string>)[errorCode] ?? AUTH_ERRORS.UNKNOWN_ERROR;
}

interface OAuthButtonProps {
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly label: string;
  readonly provider: Provider;
}

export function OAuthButton({ Icon, label, provider }: Readonly<OAuthButtonProps>): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const t = useTranslations();

  const handleOAuth = useCallback(() => {
    startTransition(async () => {
      await authClient.signIn.social({
        callbackURL: `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}`,
        fetchOptions: {
          onError: (ctx) => {
            const key = getAuthErrorKey(String(ctx.error.code ?? "UNKNOWN_ERROR"));
            toast.error(t(`auth.errors.${key}`));
          },
          onSuccess: () => {
            toast.success(t("auth.oAuth.success"));
          }
        },
        provider
      });
    });
  }, [provider, t]);

  return (
    <Button
      type="button"
      variant="outline"
      size="xl"
      disabled={isPending}
      onClick={handleOAuth}
      id={`oauth-button-${provider}`}
      aria-label={t(`auth.oAuth.${provider}`)}
      className="w-full gap-3 border-border/50 hover:border-border"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
    </Button>
  );
}
