import { type JSX, type SyntheticEvent, useCallback, useState } from "react";

import type { ErrorContext } from "@better-fetch/fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { authClient } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";
import { type ForgotPasswordFormValues, forgotPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";

import { Button } from "~/src/components/shadcn/button";
import { Field, FieldContent, FieldError, FieldLabel } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

export function hasForgetPassword(client: typeof authClient): client is typeof authClient & {
  forgetPassword: (data: {
    email: string;
    redirectTo?: string;
    fetchOptions?: {
      onError?: (ctx: ErrorContext) => void;
      onSuccess?: () => void;
    };
  }) => Promise<unknown>;
} {
  return "forgetPassword" in client;
}

const LABEL_CLASS = "text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function ForgotPasswordForm(): JSX.Element {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const t = useTranslations();

  const formSchema = forgotPasswordSchema(t);
  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(formSchema)
  });

  const onSubmit = useCallback(
    async (data: ForgotPasswordFormValues) => {
      if (hasForgetPassword(authClient)) {
        await authClient.forgetPassword({
          email: data.email,
          fetchOptions: {
            onError: (ctx: ErrorContext) => {
              const errCode = ctx.error?.message ?? "UNKNOWN_ERROR";
              toast.error(t(`auth.errors.${AUTH_ERRORS[errCode] ?? AUTH_ERRORS.UNKNOWN_ERROR}`));
            },
            onSuccess: () => {
              setHasSubmitted(true);
              toast.success(t("auth.forgotPasswordPage.success"));
            }
          },
          redirectTo: "/auth/reset-password"
        });
      }
    },
    [t]
  );

  const handleFormSubmit = useCallback(
    (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      void form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit]
  );

  const { isSubmitting } = form.formState;

  if (hasSubmitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("auth.forgotPasswordPage.checkEmail")}</p>
      </div>
    );
  }

  return (
    <form id="forgot-password-form" onSubmit={handleFormSubmit} className="space-y-5">
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="forgot-password-email" className={LABEL_CLASS}>
              {t("components.custom.authForm.email")}
            </FieldLabel>
            <FieldContent>
              <Input
                {...field}
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                disabled={isSubmitting}
                placeholder="john@example.com"
              />
              {fieldState.error !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
            </FieldContent>
          </Field>
        )}
      />

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("auth.forgotPasswordPage.submitting") : t("auth.forgotPasswordPage.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
