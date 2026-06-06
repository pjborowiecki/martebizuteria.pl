import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { authClient } from "~/src/integrations/better-auth/auth._client";
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.errors";

import { syncQueryInvalidation } from "~/src/lib/_utils/query-client-sync";
import { buildLocalizedUrl } from "~/src/lib/utils";

type OAuthProvider = "google" | "github";

/** Social sign-in; on settle, refreshes the admin customer registry (new OAuth users). */
export function useOAuthSignIn(): UseMutationResult<void, unknown, OAuthProvider> {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const locale = useLocale();

  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const { error } = await authClient.signIn.social({
        callbackURL: buildLocalizedUrl("", CONSTANTS.ROUTES.ACCOUNT_OVERVIEW, locale),
        provider
      });

      if (error !== null && error !== undefined) {
        throw new Error("OAUTH_SIGN_IN_FAILED", { cause: error });
      }
    },
    onError: (error) => {
      const authError = error instanceof Error ? error.cause : error;
      toast.error(t("pages.auth.toast.errorTitle"), {
        description: getAuthErrorMessage(t, authError)
      });
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS);
    },
    onSuccess: () => {
      toast.success(t("pages.auth.toast.signInTitle"), {
        description: t("pages.auth.toast.signInDescription")
      });
    }
  });
}
