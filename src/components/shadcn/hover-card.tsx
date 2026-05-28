import type { JSX } from "react";

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";

import { cn } from "~/src/lib/utils";

const DEFAULT_ALIGN_OFFSET = 4;
const DEFAULT_SIDE_OFFSET = 4;

function HoverCard({ ...props }: Readonly<PreviewCardPrimitive.Root.Props>): JSX.Element {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: Readonly<PreviewCardPrimitive.Trigger.Props>): JSX.Element {
  return <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

interface HoverCardContentProps extends PreviewCardPrimitive.Popup.Props {
  readonly align?: PreviewCardPrimitive.Positioner.Props["align"];
  readonly alignOffset?: PreviewCardPrimitive.Positioner.Props["alignOffset"];
  readonly side?: PreviewCardPrimitive.Positioner.Props["side"];
  readonly sideOffset?: PreviewCardPrimitive.Positioner.Props["sideOffset"];
}

function HoverCardContent({
  align = "center",
  alignOffset = DEFAULT_ALIGN_OFFSET,
  className,
  side = "bottom",
  sideOffset = DEFAULT_SIDE_OFFSET,
  ...props
}: Readonly<HoverCardContentProps>): JSX.Element {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner align={align} alignOffset={alignOffset} className="isolate z-50" side={side} sideOffset={sideOffset}>
        <PreviewCardPrimitive.Popup
          className={cn(
            "z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-2.5 text-xs/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          data-slot="hover-card-content"
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
