import { type JSX, useCallback, useTransition } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signOut } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";

import { Button } from "~/src/components/shadcn/button";

function getAuthErrorKey(errorCode: string): string {
  return (AUTH_ERRORS as Record<string, string>)[errorCode] ?? AUTH_ERRORS.UNKNOWN_ERROR;
}

export function SignOutButton(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const navigate = useNavigate();
  const t = useTranslations();

  const handleSignOut = useCallback(() => {
    startTransition(async () => {
      await signOut({
        fetchOptions: {
          onError: (ctx) => {
            const key = getAuthErrorKey(String(ctx.error.code ?? "UNKNOWN_ERROR"));
            toast.error(t(`auth.errors.${key}`));
          },
          onSuccess: () => {
            toast.success(t("auth.signOut.success"));
            void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.AUTH_SIGN_IN}` });
          }
        }
      });
    });
  }, [navigate, t]);

  return (
    <Button variant="ghost" disabled={isPending} onClick={handleSignOut}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {t("account.sidebar.signOut")}
    </Button>
  );
}
