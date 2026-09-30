import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { FieldError } from "~/src/presentation/components/shadcn/field"

export const ValidationFieldError = ({ message, namespace, params }: ValidationFieldErrorProps): JSX.Element | undefined => {
  const t = useTranslations()

  if (message === undefined || message === "") {
    return undefined
  }

  const key = `${namespace}.${message}`

  return <FieldError>{t.has(key) ? t(key, params?.[message]) : t(`errors.action.${ERROR_CODES.VALIDATION}`)}</FieldError>
}

interface ValidationFieldErrorProps {
  readonly message?: string | undefined
  readonly namespace: string
  readonly params?: Record<string, Record<string, number>>
}
