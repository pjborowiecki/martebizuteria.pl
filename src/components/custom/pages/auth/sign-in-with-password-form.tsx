/* eslint-disable react-perf/jsx-no-new-function-as-prop, react/jsx-max-depth */
import { type JSX, type SyntheticEvent, useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signIn } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";
import { type SignInFormValues, signInWithPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";

import { Button } from "~/src/components/shadcn/button";
import { Field, FieldContent, FieldError, FieldLabel } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";

import { PasswordToggle } from "~/src/components/custom/pages/auth/password-toggle";

const LABEL_CLASS = "text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

function getAuthErrorKey(errorCode: string): string {
  return (AUTH_ERRORS as Record<string, string>)[errorCode] ?? AUTH_ERRORS.UNKNOWN_ERROR;
}

export function SignInWithPasswordForm(): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const t = useTranslations();

  const formSchema = signInWithPasswordSchema(t);
  const form = useForm<SignInFormValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(formSchema)
  });

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (data: SignInFormValues) => {
      await signIn.email({
        email: data.email,
        fetchOptions: {
          onError: (ctx) => {
            toast.error(t(`auth.errors.${getAuthErrorKey(String(ctx.error.code ?? "UNKNOWN_ERROR"))}`));
          },
          onSuccess: () => {
            toast.success(t("auth.signInPage.success"));
            void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}` });
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
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="sign-in-email" className={LABEL_CLASS}>
              {t("components.custom.authForm.email")}
            </FieldLabel>
            <FieldContent>
              <Input
                {...field}
                id="sign-in-email"
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

      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel className={LABEL_CLASS}>
              <span className="flex w-full items-baseline justify-between">
                <label htmlFor="sign-in-password">{t("components.custom.authForm.password")}</label>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground/70 normal-case underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  {t("auth.signInPage.forgotPassword")}
                </button>
              </span>
            </FieldLabel>
            <FieldContent>
              <InputGroup>
                <InputGroupInput
                  {...field}
                  id="sign-in-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("auth.signInPage.submitting") : t("auth.signInPage.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
