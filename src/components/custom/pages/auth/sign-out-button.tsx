import { type JSX, useCallback, useTransition } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signOut } from "~/src/integrations/better-auth/auth._client";
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.errors";

import { Button } from "~/src/components/shadcn/button";

export function SignOutButton(): JSX.Element {
  const [isPending, startTransition] = useTransition();

  const navigate = useNavigate();
  const t = useTranslations();

  const handleSignOut = useCallback(() => {
    startTransition(async () => {
      await signOut({
        fetchOptions: {
          onError: (ctx) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error)
            });
          },
          onSuccess: () => {
            toast.success(t("pages.auth.toast.signOutTitle"), {
              description: t("pages.auth.toast.signOutDescription")
            });
            void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.HOME}` });
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
