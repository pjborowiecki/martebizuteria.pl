import { type CSSProperties, type ComponentProps, type JSX, useMemo } from "react"

import { cn } from "cn"
const AspectRatio = ({ className, ratio, ...props }: Readonly<AspectRatioProps>): JSX.Element => {
  const style = useMemo<AspectRatioStyle>(
    () => ({
      "--ratio": ratio,
    }),
    [ratio],
  )
  return <div className={cn("relative aspect-(--ratio)", className)} data-slot="aspect-ratio" style={style} {...props} />
}
interface AspectRatioProps extends ComponentProps<"div"> {
  readonly ratio: number
}
interface AspectRatioStyle extends CSSProperties {
  readonly "--ratio": number
}
export { AspectRatio }
