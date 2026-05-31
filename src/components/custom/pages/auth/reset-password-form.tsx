import { type JSX, type SyntheticEvent, useCallback } from "react";

import type { ErrorContext } from "@better-fetch/fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { resetPassword } from "~/src/integrations/better-auth/auth._client";
import { type ResetPasswordFormValues, resetPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";
import { getAuthErrorMessage } from "~/src/integrations/better-auth/auth.utils";

import { Button } from "~/src/components/shadcn/button";

import { AuthPasswordField } from "~/src/components/custom/pages/auth/auth-fields";

interface ResetPasswordFormProps {
  readonly token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps): JSX.Element {
  const navigate = useNavigate();
  const t = useTranslations();

  const formSchema = resetPasswordSchema(t);
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmPassword: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(formSchema)
  });

  const onSubmit = useCallback(
    async (data: ResetPasswordFormValues) => {
      await resetPassword({
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            toast.error(t("auth.toast.errorTitle"), {
              description: getAuthErrorMessage(t, ctx.error)
            });
          },
          onSuccess: () => {
            toast.success(t("auth.toast.resetPasswordTitle"), {
              description: t("auth.toast.resetPasswordDescription")
            });
            void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.AUTH_SIGN_IN}` });
          }
        },
        newPassword: data.password,
        token
      });
    },
    [navigate, t, token]
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
    <form id="reset-password-form" onSubmit={handleFormSubmit} className="space-y-5">
      <AuthPasswordField
        control={form.control}
        name="password"
        id="reset-password"
        label={t("components.custom.authForm.password")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <AuthPasswordField
        control={form.control}
        name="confirmPassword"
        id="reset-confirm-password"
        label={t("components.custom.authForm.confirmPassword")}
        autoComplete="new-password"
        disabled={isSubmitting}
        required
      />

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("auth.resetPasswordPage.submitting") : t("auth.resetPasswordPage.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
