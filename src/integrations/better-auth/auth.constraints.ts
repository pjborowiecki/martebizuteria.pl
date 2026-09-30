export const EMAIL_MAX_LENGTH = 64

export const NAME_MAX_LENGTH = 32

export const PASSWORD_MAX_LENGTH = 1024

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/u

export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/u

export const AUTH_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  emailMaxLength: { max: EMAIL_MAX_LENGTH },
  nameMaxLength: { max: NAME_MAX_LENGTH },
  passwordMaxLength: { max: PASSWORD_MAX_LENGTH },
  passwordMinLength: { min: PASSWORD_MIN_LENGTH },
}
