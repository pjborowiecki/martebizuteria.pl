import { useMemo, type ComponentProps, type CSSProperties, type JSX } from "react";

import { cn } from "~/src/lib/utils";

interface AspectRatioProps extends ComponentProps<"div"> {
  readonly ratio: number;
}

interface AspectRatioStyle extends CSSProperties {
  readonly "--ratio": number;
}

function AspectRatio({ className, ratio, ...props }: Readonly<AspectRatioProps>): JSX.Element {
  const style = useMemo<AspectRatioStyle>(
    () => ({
      "--ratio": ratio
    }),
    [ratio]
  );

  return <div className={cn("relative aspect-(--ratio)", className)} data-slot="aspect-ratio" style={style} {...props} />;
}

export { AspectRatio };
