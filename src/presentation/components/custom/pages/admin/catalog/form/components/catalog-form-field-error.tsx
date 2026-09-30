import { type JSX } from "react"

import { type ControllerFieldState } from "react-hook-form"

import { FieldError } from "~/src/presentation/components/shadcn/field"

export const CatalogFormFieldError = ({
  fieldState,
  translate,
  validationKeySet,
}: Readonly<CatalogFormFieldErrorProps>): JSX.Element | undefined => {
  const rawMessage = fieldState.error?.message
  if (rawMessage === undefined || rawMessage === "") {
    return undefined
  }

  const message =
    validationKeySet !== undefined && translate !== undefined && validationKeySet.has(rawMessage) ? translate(rawMessage) : rawMessage
  return <FieldError>{message}</FieldError>
}

interface CatalogFormFieldErrorProps {
  readonly fieldState: Pick<ControllerFieldState, "error" | "invalid">
  readonly translate?: ((messageKey: string) => string) | undefined
  readonly validationKeySet?: ReadonlySet<string> | undefined
}
