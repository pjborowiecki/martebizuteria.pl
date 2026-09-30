import { useCallback } from "react"

import { useTranslations } from "use-intl/react"

import { AUTH_ERRORS, authErrorKey } from "~/src/integrations/better-auth/auth.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const AUTH_ERROR_KEYS: readonly string[] = Object.values(AUTH_ERRORS)

const ACTION_ERROR_KEYS: readonly string[] = Object.values(ERROR_CODES)

export const useActionError = (): ((error: unknown) => string) => {
  const t = useTranslations()

  return useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : ""

      if (ACTION_ERROR_KEYS.includes(message)) {
        return t(`errors.action.${message}`)
      }

      if (AUTH_ERROR_KEYS.includes(message)) {
        return t(`pages.auth.errors.${message}`)
      }

      if (error instanceof Error && (error.name === "ZodError" || error.name === "ValidationError")) {
        return t(`errors.action.${ERROR_CODES.VALIDATION}`)
      }

      const authKey = authErrorKey(error)

      if (authKey !== AUTH_ERRORS.UNKNOWN_ERROR) {
        return t(`pages.auth.errors.${authKey}`)
      }

      return t(`errors.action.${ERROR_CODES.INTERNAL_ERROR}`)
    },
    [t],
  )
}
