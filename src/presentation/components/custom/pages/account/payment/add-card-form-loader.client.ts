import { lazy } from "react"

import "@tanstack/react-start/client-only"

import type * as AddCardFormModule from "~/src/presentation/components/custom/pages/account/payment/add-card-form.client"

const loadAddCardForm = async (): Promise<{
  default: typeof AddCardFormModule.AddCardForm
}> => {
  const m = await import("~/src/presentation/components/custom/pages/account/payment/add-card-form.client")

  return {
    default: m.AddCardForm,
  }
}

export const LazyAddCardForm = lazy(loadAddCardForm)
