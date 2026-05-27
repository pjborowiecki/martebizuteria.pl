import { type JSX, type SyntheticEvent, useCallback, useState } from "react";

import type { ErrorContext } from "@better-fetch/fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { resetPassword } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";
import { type ResetPasswordFormValues, resetPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";

import { Button } from "~/src/components/shadcn/button";
import { Field, FieldContent, FieldError, FieldLabel } from "~/src/components/shadcn/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";

import { PasswordToggle } from "~/src/components/custom/pages/auth/password-toggle";

const LABEL_CLASS = "text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

interface ResetPasswordFormProps {
  readonly token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const t = useTranslations();

  const formSchema = resetPasswordSchema(t);
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { confirmPassword: "", password: "" },
    resolver: zodResolver(formSchema)
  });

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);
  const toggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (data: ResetPasswordFormValues) => {
      await resetPassword({
        fetchOptions: {
          onError: (ctx: ErrorContext) => {
            const errCode = ctx.error?.message ?? "UNKNOWN_ERROR";
            toast.error(t(`auth.errors.${AUTH_ERRORS[errCode] ?? AUTH_ERRORS.UNKNOWN_ERROR}`));
          },
          onSuccess: () => {
            toast.success(t("auth.resetPasswordPage.success"));
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
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="reset-password" className={LABEL_CLASS}>
              {t("components.custom.authForm.password")}
            </FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  {...field}
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                />
                <InputGroupAddon align="inline-end">
                  <PasswordToggle show={showPassword} onToggle={togglePassword} />
                </InputGroupAddon>
              </InputGroup>
              {fieldState.error !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
            </FieldContent>
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="reset-confirm-password" className={LABEL_CLASS}>
              {t("components.custom.authForm.confirmPassword")}
            </FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  {...field}
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                />
                <InputGroupAddon align="inline-end">
                  <PasswordToggle show={showConfirmPassword} onToggle={toggleConfirmPassword} />
                </InputGroupAddon>
              </InputGroup>
              {fieldState.error !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
            </FieldContent>
          </Field>
        )}
      />

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("auth.resetPasswordPage.submitting") : t("auth.resetPasswordPage.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
