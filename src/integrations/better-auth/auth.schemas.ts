import { z } from "zod/v4";

const MIN_PASSWORD_LENGTH = 8;
const MIN_REQUIRED_LENGTH = 1;

export function signInWithPasswordSchema(t: (key: string) => string) {
  return z.object({
    email: z.email({ message: t("auth.validations.invalidEmail") }),
    password: z.string().min(MIN_REQUIRED_LENGTH, { message: t("auth.validations.passwordRequired") })
  });
}

export function signUpWithPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      confirmPassword: z.string().min(MIN_REQUIRED_LENGTH, { message: t("auth.validations.confirmPasswordRequired") }),
      email: z.email({ message: t("auth.validations.invalidEmail") }),
      firstName: z.string().min(MIN_REQUIRED_LENGTH, { message: t("auth.validations.firstNameRequired") }),
      lastName: z.string().min(MIN_REQUIRED_LENGTH, { message: t("auth.validations.lastNameRequired") }),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, {
          message: t("auth.validations.atLeastMinCharactersLong")
        })
        .regex(/[A-Z]/u, { message: t("auth.validations.atLeastOneUppercase") })
        .regex(/[^A-Za-z0-9]/u, { message: t("auth.validations.atLeastOneSpecialCharacter") })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validations.passwordsMustMatch"),
      path: ["confirmPassword"]
    });
}

export function forgotPasswordSchema(t: (key: string) => string) {
  return z.object({
    email: z.email({ message: t("auth.validations.invalidEmail") })
  });
}

export function resetPasswordSchema(t: (key: string) => string) {
  return z
    .object({
      confirmPassword: z.string().min(MIN_REQUIRED_LENGTH, { message: t("auth.validations.confirmPasswordRequired") }),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, {
          message: t("auth.validations.atLeastMinCharactersLong")
        })
        .regex(/[A-Z]/u, { message: t("auth.validations.atLeastOneUppercase") })
        .regex(/[^A-Za-z0-9]/u, { message: t("auth.validations.atLeastOneSpecialCharacter") })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validations.passwordsMustMatch"),
      path: ["confirmPassword"]
    });
}

export type SignInFormValues = z.infer<ReturnType<typeof signInWithPasswordSchema>>;
export type SignUpFormValues = z.infer<ReturnType<typeof signUpWithPasswordSchema>>;
export type ForgotPasswordFormValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;
export type ResetPasswordFormValues = z.infer<ReturnType<typeof resetPasswordSchema>>;
