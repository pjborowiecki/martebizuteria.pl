import { z } from "zod/v4"
export const signInWithPasswordSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email({
      message: t("pages.auth.validations.invalidEmail"),
    }),
    password: z.string().min(MIN_REQUIRED_LENGTH, {
      message: t("pages.auth.validations.passwordRequired"),
    }),
  })

export const signUpWithPasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      confirmPassword: z.string().min(MIN_REQUIRED_LENGTH, {
        message: t("pages.auth.validations.confirmPasswordRequired"),
      }),
      email: z.email({
        message: t("pages.auth.validations.invalidEmail"),
      }),
      firstName: z.string().min(MIN_REQUIRED_LENGTH, {
        message: t("pages.auth.validations.firstNameRequired"),
      }),
      lastName: z.string().min(MIN_REQUIRED_LENGTH, {
        message: t("pages.auth.validations.lastNameRequired"),
      }),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, {
          message: t("pages.auth.validations.atLeastMinCharactersLong"),
        })
        .regex(/[A-Z]/u, {
          message: t("pages.auth.validations.atLeastOneUppercase"),
        })
        .regex(/[^A-Za-z0-9]/u, {
          message: t("pages.auth.validations.atLeastOneSpecialCharacter"),
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("pages.auth.validations.passwordsMustMatch"),
      path: ["confirmPassword"],
    })

export const forgotPasswordSchema = (t: (key: string) => string) =>
  z.object({
    email: z.email({
      message: t("pages.auth.validations.invalidEmail"),
    }),
  })

export const resetPasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      confirmPassword: z.string().min(MIN_REQUIRED_LENGTH, {
        message: t("pages.auth.validations.confirmPasswordRequired"),
      }),
      password: z
        .string()
        .min(MIN_PASSWORD_LENGTH, {
          message: t("pages.auth.validations.atLeastMinCharactersLong"),
        })
        .regex(/[A-Z]/u, {
          message: t("pages.auth.validations.atLeastOneUppercase"),
        })
        .regex(/[^A-Za-z0-9]/u, {
          message: t("pages.auth.validations.atLeastOneSpecialCharacter"),
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("pages.auth.validations.passwordsMustMatch"),
      path: ["confirmPassword"],
    })

const MIN_PASSWORD_LENGTH = 8
const MIN_REQUIRED_LENGTH = 1
export type SignInFormValues = z.infer<ReturnType<typeof signInWithPasswordSchema>>
export type SignUpFormValues = z.infer<ReturnType<typeof signUpWithPasswordSchema>>
export type ForgotPasswordFormValues = z.infer<ReturnType<typeof forgotPasswordSchema>>
export type ResetPasswordFormValues = z.infer<ReturnType<typeof resetPasswordSchema>>
