import type { JSX } from "react";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "~/src/lib/utils";

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

function Slider({
  className,
  defaultValue,
  value,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  ...props
}: Readonly<SliderPrimitive.Root.Props>): JSX.Element {
  const values = ((): readonly number[] => {
    if (Array.isArray(value)) {
      return value as readonly number[];
    }
    if (Array.isArray(defaultValue)) {
      return defaultValue as readonly number[];
    }
    return [min, max];
  })();

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-lg bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {values.map((v) => (
          <SliderPrimitive.Thumb
            key={v}
            data-slot="slider-thumb"
            className="relative block size-3 shrink-0 rounded-lg border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden active:ring-1 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
