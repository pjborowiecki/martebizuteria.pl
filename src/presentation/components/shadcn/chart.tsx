import {
  type CSSProperties,
  type ComponentProps,
  type ComponentType,
  type JSX,
  type ReactNode,
  createContext,
  useContext,
  useId,
  useMemo,
} from "react"

import { cn } from "cn"
import { type TooltipValueType } from "recharts"
import * as RechartsPrimitive from "recharts"
import { type Payload as TooltipPayload } from "recharts/types/component/DefaultTooltipContent"

const useChart = (): ChartContextProps => {
  const context = useContext(ChartContext)
  if (context === undefined) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = ({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: Readonly<ChartContainerProps>): JSX.Element => {
  const uniqueId = useId()
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`
  const contextValue = useMemo(
    () => ({
      config,
    }),
    [config],
  )

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const isThemeKey = (key: string): key is ThemeKey => key === "light" || key === "dark"

const ChartTooltipItem = ({
  item,
  index,
  indicator,
  nestLabel,
  tooltipLabel,
  hideIndicator,
  itemConfig,
  color,
  formatter,
  payload,
}: Readonly<ChartTooltipItemProps>): JSX.Element => {
  const itemPayloadRaw: unknown = item.payload
  const itemPayload =
    typeof itemPayloadRaw === "object" && itemPayloadRaw !== null && !Array.isArray(itemPayloadRaw)
      ? Object.fromEntries(Object.entries(itemPayloadRaw))
      : {}
  const fill = Object.hasOwn(itemPayload, "fill") && typeof itemPayload["fill"] === "string" ? itemPayload["fill"] : undefined
  const indicatorColor: string = color ?? fill ?? item.color ?? ""
  const indicatorStyle: Record<string, string> & CSSProperties = useMemo(
    () => ({
      "--color-bg": indicatorColor,
      "--color-border": indicatorColor,
    }),
    [indicatorColor],
  )

  if (formatter !== undefined && item.value !== undefined && typeof item.name === "string") {
    return <>{formatter(item.value, item.name, item, index, payload)}</>
  }

  return (
    <>
      {itemConfig?.icon === undefined ? (
        !hideIndicator && (
          <div
            className={cn("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
              "h-2.5 w-2.5": indicator === "dot",
              "my-0.5": nestLabel && indicator === "dashed",
              "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
              "w-1": indicator === "line",
            })}
            style={indicatorStyle}
          />
        )
      ) : (
        <itemConfig.icon />
      )}
      <div
        className={cn("flex flex-1 justify-between leading-none", {
          "items-center": !nestLabel,
          "items-end": nestLabel,
        })}
      >
        <div className="grid gap-1.5">
          {nestLabel ? tooltipLabel : undefined}
          <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
        </div>
        {item.value !== undefined && (
          <span className="font-mono font-medium text-foreground tabular-nums">
            {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value)}
          </span>
        )}
      </div>
    </>
  )
}

const resolveKey = (...parts: (string | number | undefined | null | ((value: unknown) => unknown))[]): string => {
  for (const part of parts) {
    if (typeof part === "string" && part.length > 0) {
      return part
    }

    if (typeof part === "number") {
      return String(part)
    }
  }

  return "value"
}

const ChartTooltipContent = ({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: Readonly<ChartTooltipContentProps>): JSX.Element | undefined => {
  const { config } = useChart()
  const tooltipLabel = useMemo(() => {
    if (hideLabel || payload === undefined || payload.length === 0) {
      return
    }

    const [item] = payload
    const key = resolveKey(labelKey, item?.dataKey, item?.name)
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = labelKey === undefined && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label
    if (labelFormatter !== undefined) {
      return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
    }

    if (value === undefined || value === "") {
      return
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (active !== true || payload === undefined || payload.length === 0) {
    return
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!nestLabel && tooltipLabel}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = resolveKey(nameKey, item.name, item.dataKey)
            const reactKey = `${key}-${resolveKey(item.dataKey)}-${item.name ?? ""}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)

            return (
              <div
                key={reactKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center",
                )}
              >
                <ChartTooltipItem
                  item={item}
                  index={index}
                  indicator={indicator}
                  nestLabel={nestLabel}
                  tooltipLabel={tooltipLabel}
                  hideIndicator={hideIndicator}
                  itemConfig={itemConfig}
                  color={color}
                  formatter={formatter}
                  payload={payload}
                />
              </div>
            )
          })}
      </div>
    </div>
  )
}

const ChartLegendContent = ({
  className,
  hideIcon = false,
  payload,
  position = "bottom",
  nameKey,
}: Readonly<ChartLegendContentProps>): JSX.Element | undefined => {
  const { config } = useChart()
  if (payload === undefined || payload.length === 0) {
    return
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        {
          "pb-3": position === "top",
          "pt-3": position !== "top",
        },
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = resolveKey(nameKey, item.dataKey)
          const reactKey = `${key}-${resolveKey(item.dataKey)}-${item.color ?? ""}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div key={reactKey} className={cn("flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground")}>
              {itemConfig?.icon === undefined || hideIcon ? <ChartLegendColorSwatch color={item.color} /> : <itemConfig.icon />}
              {itemConfig?.label}
            </div>
          )
        })}
    </div>
  )
}

const ChartLegendColorSwatch = ({ color }: Readonly<ChartLegendColorSwatchProps>): JSX.Element => {
  const style = useMemo<CSSProperties>(
    () => ({
      backgroundColor: color,
    }),
    [color],
  )

  return <div className="h-2 w-2 shrink-0 rounded-[2px]" style={style} />
}

const getPayloadConfigFromPayload = (config: ChartConfig, payload: unknown, key: string): ChartConfigItem | undefined => {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined
  }

  const recMap = new Map<string, unknown>(Object.entries(payload) as [string, unknown][])
  let nestedMap: Map<string, unknown> | undefined = undefined
  const rawNested = recMap.get("payload")
  if (typeof rawNested === "object" && rawNested !== null && !Array.isArray(rawNested)) {
    nestedMap = new Map<string, unknown>(Object.entries(rawNested) as [string, unknown][])
  }

  let configLabelKey: string = key
  const directVal = recMap.get(key)
  if (typeof directVal === "string") {
    configLabelKey = directVal
  } else {
    const nestedVal = nestedMap?.get(key)
    if (typeof nestedVal === "string") {
      configLabelKey = nestedVal
    }
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

const THEMES = {
  dark: ".dark",
  light: "",
} as const

type ThemeKey = keyof typeof THEMES

const INITIAL_DIMENSION = {
  height: 200,
  width: 320,
} as const

export type ChartConfig = Record<
  string,
  {
    label?: ReactNode
    icon?: ComponentType
  } & (
    | {
        color?: string
        theme?: never
      }
    | {
        color?: never
        theme: Record<ThemeKey, string>
      }
  )
>

type ChartConfigItem = ChartConfig[string]

interface ChartContextProps {
  config: ChartConfig
}

const ChartContext = createContext<ChartContextProps | undefined>(undefined)

interface ChartContainerProps extends ComponentProps<"div"> {
  readonly config: ChartConfig
  readonly children: ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  readonly initialDimension?: {
    readonly width: number
    readonly height: number
  }
}

interface ChartStyleProps {
  readonly id: string
  readonly config: ChartConfig
}

const ChartStyle = ({ id, config }: Readonly<ChartStyleProps>): JSX.Element | undefined => {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme !== undefined || cfg.color !== undefined)
  if (colorConfig.length === 0) {
    return
  }

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const vars = colorConfig
        .map(([key, itemConfig]) => {
          const color = isThemeKey(theme) ? (itemConfig.theme?.[theme] ?? itemConfig.color) : itemConfig.color
          if (color !== undefined) {
            return `  --color-${key}: ${color};`
          }

          return ""
        })
        .join("\n")
      return `\n${prefix} [data-chart=${id}] {\n${vars}\n}`
    })
    .join("\n")
  return <style>{css}</style>
}

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = ComponentProps<typeof RechartsPrimitive.Tooltip> &
  ComponentProps<"div"> &
  Omit<RechartsPrimitive.DefaultTooltipContentProps<TooltipValueType, string>, "accessibilityLayer"> & {
    readonly hideLabel?: boolean
    readonly hideIndicator?: boolean
    readonly indicator?: "line" | "dot" | "dashed"
    readonly nameKey?: string
    readonly labelKey?: string
  }

interface ChartTooltipItemProps {
  readonly item: TooltipPayload<TooltipValueType, string>
  readonly index: number
  readonly indicator: "line" | "dot" | "dashed"
  readonly nestLabel: boolean
  readonly tooltipLabel: ReactNode
  readonly hideIndicator: boolean
  readonly itemConfig: ChartConfigItem | undefined
  readonly color: string | undefined
  readonly formatter: ChartTooltipContentProps["formatter"]
  readonly payload: readonly TooltipPayload<TooltipValueType, string>[]
}

const ChartLegend = RechartsPrimitive.Legend

type ChartLegendContentProps = ComponentProps<"div"> &
  RechartsPrimitive.DefaultLegendContentProps & {
    readonly position?: RechartsPrimitive.CartesianPosition
    readonly hideIcon?: boolean
    readonly nameKey?: string
  }

interface ChartLegendColorSwatchProps {
  readonly color: string | undefined
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent }
