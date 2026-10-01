import { z } from "zod/v4"

import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SPECIAL_CHAR_PATTERN,
  PASSWORD_UPPERCASE_PATTERN,
} from "~/src/integrations/better-auth/auth.constraints"

import { MIN_FIELD_LENGTH } from "~/src/modules/_core/utils/zod-fields"

export const emailSchema = z.email({ message: "invalidEmail" }).max(EMAIL_MAX_LENGTH, { message: "emailMaxLength" })

export const signInPasswordSchema = z.string().min(MIN_FIELD_LENGTH, { message: "passwordRequired" })

export const strictPasswordSchema = signInPasswordSchema
  .min(PASSWORD_MIN_LENGTH, { message: "passwordMinLength" })
  .max(PASSWORD_MAX_LENGTH, { message: "passwordMaxLength" })
  .refine((value) => PASSWORD_UPPERCASE_PATTERN.test(value), { message: "passwordUppercase" })
  .refine((value) => PASSWORD_SPECIAL_CHAR_PATTERN.test(value), { message: "passwordSpecialCharacter" })

const nameSchema = (requiredMessage: string) =>
  z.string().min(MIN_FIELD_LENGTH, { message: requiredMessage }).max(NAME_MAX_LENGTH, { message: "nameMaxLength" })

const withMatchingPasswords = <TSchema extends z.ZodType<{ confirmPassword: string; password: string }>>(schema: TSchema) =>
  schema.refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  })

const passwordConfirmationSchema = z.object({
  confirmPassword: z.string().min(MIN_FIELD_LENGTH, { message: "confirmPasswordRequired" }),
  password: strictPasswordSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const signInWithPasswordSchema = z.object({
  email: emailSchema,
  password: signInPasswordSchema,
})

export const resetPasswordSchema = withMatchingPasswords(passwordConfirmationSchema)

export const changePasswordSchema = withMatchingPasswords(
  passwordConfirmationSchema.extend({
    currentPassword: signInPasswordSchema,
    revokeOtherSessions: z.boolean(),
  }),
).refine((data) => data.currentPassword !== data.password, {
  message: "passwordUnchanged",
  path: ["password"],
})

export const passwordConfirmSchema = z.object({
  password: signInPasswordSchema,
})

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/u, { message: "totpCodeInvalid" }),
})

export const twoFactorChallengeSchema = z.object({
  code: z.string().trim().min(MIN_FIELD_LENGTH, { message: "totpCodeRequired" }),
  trustDevice: z.boolean(),
})

export const signUpWithPasswordSchema = withMatchingPasswords(
  passwordConfirmationSchema.extend({
    email: emailSchema,
    firstName: nameSchema("firstNameRequired"),
    lastName: nameSchema("lastNameRequired"),
  }),
)

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export type PasswordConfirmFormValues = z.infer<typeof passwordConfirmSchema>

export type TotpCodeFormValues = z.infer<typeof totpCodeSchema>

export type TwoFactorChallengeFormValues = z.infer<typeof twoFactorChallengeSchema>

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export type SignInFormValues = z.infer<typeof signInWithPasswordSchema>

export type SignUpFormValues = z.infer<typeof signUpWithPasswordSchema>
