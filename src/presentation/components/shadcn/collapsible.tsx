import { type JSX } from "react"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
const Collapsible = ({ ...props }: Readonly<CollapsiblePrimitive.Root.Props>): JSX.Element => (
  <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
)

const CollapsibleTrigger = ({ ...props }: Readonly<CollapsiblePrimitive.Trigger.Props>): JSX.Element => (
  <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
)

const CollapsibleContent = ({ ...props }: Readonly<CollapsiblePrimitive.Panel.Props>): JSX.Element => (
  <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
)

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
