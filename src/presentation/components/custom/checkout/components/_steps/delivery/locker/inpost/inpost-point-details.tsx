import { type JSX } from "react"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"
export const PointDetails = ({ point }: { readonly point: InpostPointParsed }): JSX.Element => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="text-xs font-medium text-foreground">{point.name}</span>
    <span className="truncate text-[11px] text-muted-foreground">
      {point.address_details.street}
      {point.address_details.building_number !== null && point.address_details.building_number !== ""
        ? ` ${point.address_details.building_number}`
        : ""}
      , {point.address_details.city}
    </span>
    {point.location_description !== "" && (
      <span className="truncate text-[10px] text-muted-foreground/70">{point.location_description}</span>
    )}
  </div>
)
