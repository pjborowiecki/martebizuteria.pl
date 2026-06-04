import { type JSX, type SyntheticEvent, useCallback } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signIn } from "~/src/integrations/better-auth/auth._client";
import { hasAdminAccess } from "~/src/integrations/better-auth/auth.permissions";
import { type SignInFormValues, signInWithPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.utils";

import { Button } from "~/src/components/shadcn/button";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { AuthPasswordField, AuthTextField } from "~/src/components/custom/pages/auth/auth-fields";

import { sessionQueries } from "~/src/modules/session/session.queries";

export function SignInWithPasswordForm(): JSX.Element {
  const navigate = useNavigate();
  const t = useTranslations();

  const formSchema = signInWithPasswordSchema(t);
  const form = useForm<SignInFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(formSchema)
  });

  const onSubmit = useCallback(
    async (data: SignInFormValues) => {
      await signIn.email({
        email: data.email,
        fetchOptions: {
          onError: (ctx) => {
            toast.error(t("pages.auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error)
            });
          },
          onSuccess: async () => {
            toast.success(t("pages.auth.toast.signInTitle"), {
              description: t("pages.auth.toast.signInDescription")
            });
            const session = await sessionQueries.getSessionFn();
            const to = hasAdminAccess(session?.user.role)
              ? `/{-$locale}${CONSTANTS.ROUTES.ADMIN_OVERVIEW}`
              : `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}`;
            void navigate({ to });
          }
        },
        password: data.password
      });
    },
    [navigate, t]
  );

  const handleFormSubmit = useCallback(
    (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      void form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit]
  );

  const { isSubmitting } = form.formState;

  return (
    <form id="sign-in-form" onSubmit={handleFormSubmit} className="space-y-5">
      <AuthTextField
        control={form.control}
        name="email"
        id="sign-in-email"
        type="email"
        label={t("components.custom.authForm.email")}
        autoComplete="email"
        disabled={isSubmitting}
        required
      />

      <div className="space-y-2">
        <AuthPasswordField
          control={form.control}
          name="password"
          id="sign-in-password"
          label={t("components.custom.authForm.password")}
          autoComplete="current-password"
          disabled={isSubmitting}
          required
        />
        <div className="flex justify-end">
          <LocalizedLink
            to={CONSTANTS.ROUTES.AUTH_FORGOT_PASSWORD}
            className="text-xs text-muted-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t("pages.auth.sign-in.forgotPassword")}
          </LocalizedLink>
        </div>
      </div>

      <Button size="xl" type="submit" className="w-full gap-3.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("pages.auth.sign-in.submitting") : t("pages.auth.sign-in.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
