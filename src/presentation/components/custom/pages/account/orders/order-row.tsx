import { type JSX, useCallback, useId, useState } from "react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { OrderRowDetails } from "~/src/presentation/components/custom/pages/account/orders/order-row-details"
import { OrderRowHeader } from "~/src/presentation/components/custom/pages/account/orders/order-row-header"

export const OrderRow = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderSummary"]
}>): JSX.Element => {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const toggleExpanded = useCallback(() => {
    setExpanded((previous) => !previous)
  }, [])

  return (
    <div>
      <OrderRowHeader detailsId={detailsId} expanded={expanded} order={order} toggleExpanded={toggleExpanded} />
      <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden" id={detailsId}>
          {expanded && <OrderRowDetails order={order} />}
        </div>
      </div>
    </div>
  )
}
