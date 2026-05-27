import { type JSX, type SyntheticEvent, useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { signUp } from "~/src/integrations/better-auth/auth.client";
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors";
import { type SignUpFormValues, signUpWithPasswordSchema } from "~/src/integrations/better-auth/auth.schemas";

import { Button } from "~/src/components/shadcn/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { PasswordToggle } from "~/src/components/custom/pages/auth/password-toggle";

const LABEL_CLASS = "text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

export function SignUpWithPasswordForm(): JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const t = useTranslations();

  const formSchema = signUpWithPasswordSchema(t);
  const form = useForm<SignUpFormValues>({
    defaultValues: { confirmPassword: "", email: "", firstName: "", lastName: "", password: "" },
    mode: "onChange",
    resolver: zodResolver(formSchema)
  });

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (data: SignUpFormValues) => {
      await signUp.email({
        email: data.email,
        fetchOptions: {
          onError: (ctx) => {
            const errCode = String(ctx.error.code ?? "UNKNOWN_ERROR");
            toast.error(t(`auth.errors.${AUTH_ERRORS[errCode] ?? AUTH_ERRORS.UNKNOWN_ERROR}`));
          },
          onSuccess: () => {
            toast.success(t("auth.signUpPage.success"));
            void navigate({ to: `/{-$locale}${CONSTANTS.ROUTES.ACCOUNT_OVERVIEW}` });
          }
        },
        name: `${data.firstName} ${data.lastName}`.trim(),
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
    <form id="sign-up-form" onSubmit={handleFormSubmit} className="space-y-5">
      <FieldGroup className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="sign-up-first-name" className={LABEL_CLASS}>
                  {t("components.custom.authForm.firstName")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    id="sign-up-first-name"
                    autoComplete="given-name"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  {fieldState.error !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
                </FieldContent>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="lastName"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor="sign-up-last-name" className={LABEL_CLASS}>
                  {t("components.custom.authForm.lastName")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    id="sign-up-last-name"
                    autoComplete="family-name"
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  {fieldState.error !== undefined && <FieldError>{fieldState.error.message}</FieldError>}
                </FieldContent>
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel htmlFor="sign-up-email" className={LABEL_CLASS}>
                {t("components.custom.authForm.email")}
              </FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  id="sign-up-email"
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
              <FieldLabel htmlFor="sign-up-password" className={LABEL_CLASS}>
                {t("components.custom.authForm.password")}
              </FieldLabel>
              <FieldContent>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    id="sign-up-password"
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
              <FieldLabel htmlFor="sign-up-confirm-password" className={LABEL_CLASS}>
                {t("components.custom.authForm.password")}
              </FieldLabel>
              <FieldContent>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    id="sign-up-confirm-password"
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
      </FieldGroup>

      <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground/70">
        {t.rich("auth.signUpPage.terms", {
          privacy: (chunks) => (
            <LocalizedLink
              to={CONSTANTS.ROUTES.PRIVACY_POLICY}
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {chunks}
            </LocalizedLink>
          ),
          terms: (chunks) => (
            <LocalizedLink
              to={CONSTANTS.ROUTES.TERMS_OF_SERVICE}
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {chunks}
            </LocalizedLink>
          )
        })}
      </p>

      <Button size="xl" type="submit" className="w-full gap-2.5 tracking-wide" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isSubmitting ? t("auth.signUpPage.submitting") : t("auth.signUpPage.submit")}
        {!isSubmitting && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
