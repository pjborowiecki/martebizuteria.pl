import type { JSX } from "react";

import type { ControllerFieldState } from "react-hook-form";

import { FieldError } from "~/src/components/shadcn/field";

interface CatalogFormFieldErrorProps {
  readonly fieldState: Pick<ControllerFieldState, "error" | "invalid">;
  readonly translate?: (messageKey: string) => string;
  readonly validationKeySet?: ReadonlySet<string>;
}

/** Renders a translated react-hook-form field error under catalog sheet fields. */
export function CatalogFormFieldError({
  fieldState,
  translate,
  validationKeySet
}: Readonly<CatalogFormFieldErrorProps>): JSX.Element | undefined {
  const rawMessage = fieldState.error?.message;
  if (rawMessage === undefined || rawMessage === "") {
    return undefined;
  }

  const message =
    validationKeySet !== undefined && translate !== undefined && validationKeySet.has(rawMessage) ? translate(rawMessage) : rawMessage;

  return <FieldError>{message}</FieldError>;
}
