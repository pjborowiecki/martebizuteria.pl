import { useCallback } from "react"

import { useNavigate } from "@tanstack/react-router"

import { type Order } from "~/src/modules/order/order.types"

export const useOpenOrder = (): ((order: Order["adminListItem"]) => void) => {
  const navigate = useNavigate()

  return useCallback(
    (order: Order["adminListItem"]) => {
      void navigate({
        params: {
          orderId: order.id,
        },
        to: "/admin/orders/$orderId",
      })
    },
    [navigate],
  )
}
