import { type ComponentProps, type JSX, createContext, useContext, useEffect, useMemo, useRef } from "react"

import { cn } from "cn"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { type DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
const CalendarRoot = ({ className, rootRef, ...props }: Readonly<RootProps>): JSX.Element => (
  <div className={cn(className)} data-slot="calendar" ref={rootRef} {...props} />
)
const CalendarChevron = ({ className, orientation, ...props }: Readonly<ChevronProps>): JSX.Element => {
  if (orientation === "left") {
    return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
  }
  if (orientation === "right") {
    return <ChevronRightIcon className={cn("size-4", className)} {...props} />
  }
  return <ChevronDownIcon className={cn("size-4", className)} {...props} />
}
const CalendarWeekNumber = ({ children, ...props }: Readonly<WeekNumberProps>): JSX.Element => (
  <td {...props}>
    <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
  </td>
)
const useCalendarStyles = (opt: StyleOptions) => {
  const defaults = getDefaultClassNames()
  return useMemo(() => {
    let cap = "font-medium select-none text-sm"
    if (opt.captionLayout !== "label") {
      cap = "flex items-center gap-1 rounded-(--cell-radius) text-sm font-medium select-none [&>svg]:size-3.5 [&>svg]:text-muted-foreground"
    }
    let date =
      "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius) [&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)"
    if (opt.showWeekNumber) {
      date =
        "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius) [&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
    }
    const navBtn = "size-(--cell-size) p-0 select-none aria-disabled:opacity-50"
    return {
      ...BASE_CLASS_NAMES,
      button_next: cn(
        buttonVariants({
          variant: opt.buttonVariant,
        }),
        navBtn,
        defaults.button_next,
      ),
      button_previous: cn(
        buttonVariants({
          variant: opt.buttonVariant,
        }),
        navBtn,
        defaults.button_previous,
      ),
      caption_label: cn(cap, defaults.caption_label),
      day: cn(date, defaults.day),
      ...opt.classNames,
    }
  }, [opt, defaults])
}
const useCalendarConfig = (
  components?: DayPickerComponents,
  formatters?: ComponentProps<typeof DayPicker>["formatters"],
  locale?: DayPickerLocale,
) => {
  const fmts = useMemo(
    () => ({
      formatMonthDropdown: (date: Date) =>
        date.toLocaleString(locale?.code, {
          month: "short",
        }),
      ...formatters,
    }),
    [locale, formatters],
  )
  const comps = useMemo(
    () => ({
      Chevron: CalendarChevron,
      DayButton: CalendarDayButtonSlot,
      Root: CalendarRoot,
      WeekNumber: CalendarWeekNumber,
      ...components,
    }),
    [components],
  )
  return {
    comps,
    fmts,
  }
}
const CalendarDayButtonSlot = ({ ...props }: Readonly<DayButtonProps>): JSX.Element => {
  const locale = useContext(CalendarLocaleContext)
  return <CalendarDayButton locale={locale} {...props} />
}
const Calendar = ({
  buttonVariant = "ghost",
  captionLayout = "label",
  className,
  classNames,
  components,
  formatters,
  locale,
  showOutsideDays = true,
  ...props
}: Readonly<
  ComponentProps<typeof DayPicker> & {
    buttonVariant?: ComponentProps<typeof Button>["variant"]
  }
>): JSX.Element => {
  const styles = useCalendarStyles({
    buttonVariant,
    captionLayout,
    classNames,
    showWeekNumber: props.showWeekNumber === true,
  })
  const { comps, fmts } = useCalendarConfig(components, formatters, locale)
  return (
    <CalendarLocaleContext.Provider value={locale}>
      <DayPicker
        captionLayout={captionLayout}
        className={cn(
          "group/calendar bg-background p-2 [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
          String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
          String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
          className,
        )}
        classNames={styles}
        components={comps}
        formatters={fmts}
        locale={locale}
        showOutsideDays={showOutsideDays}
        {...props}
      />
    </CalendarLocaleContext.Provider>
  )
}
const CalendarDayButton = ({
  className,
  day,
  locale,
  modifiers,
  ...props
}: Readonly<
  ComponentProps<typeof DayButton> & {
    locale?: DayPickerLocale
  }
>): JSX.Element => {
  const defaults = getDefaultClassNames()
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (modifiers["focused"] !== true) {
      return
    }
    ref.current?.focus()
  }, [modifiers["focused"]])
  const isSel =
    modifiers["selected"] === true &&
    modifiers["range_start"] !== true &&
    modifiers["range_end"] !== true &&
    modifiers["range_middle"] !== true
  return (
    <Button
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaults.day,
        className,
      )}
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-range-end={modifiers["range_end"]}
      data-range-middle={modifiers["range_middle"]}
      data-range-start={modifiers["range_start"]}
      data-selected-single={isSel}
      size="icon"
      variant="ghost"
      {...props}
    />
  )
}
type FirstArg<TValue> = TValue extends (arg: infer TArgument, ...args: readonly any[]) => any ? TArgument : never
type DayPickerComponents = NonNullable<ComponentProps<typeof DayPicker>["components"]>
type DayPickerLocale = ComponentProps<typeof DayPicker>["locale"]
type RootProps = FirstArg<NonNullable<DayPickerComponents["Root"]>>
type ChevronProps = FirstArg<NonNullable<DayPickerComponents["Chevron"]>>
type WeekNumberProps = FirstArg<NonNullable<DayPickerComponents["WeekNumber"]>>
type DayButtonProps = FirstArg<NonNullable<DayPickerComponents["DayButton"]>>
const CalendarLocaleContext = createContext<DayPickerLocale | undefined>(undefined)
const BASE_CLASS_NAMES = {
  disabled: "text-muted-foreground opacity-50",
  dropdown: "absolute inset-0 bg-popover opacity-0",
  dropdown_root: "relative rounded-(--cell-radius)",
  dropdowns: "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
  hidden: "invisible",
  month: "flex w-full flex-col gap-4",
  month_caption: "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
  months: "relative flex flex-col gap-4 md:flex-row",
  nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
  outside: "text-muted-foreground aria-selected:text-muted-foreground",
  range_end: "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
  range_middle: "rounded-none",
  range_start:
    "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
  root: "w-fit",
  table: "w-full border-collapse",
  today: "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
  week: "mt-2 flex w-full",
  week_number: "text-[0.8rem] text-muted-foreground select-none",
  week_number_header: "w-(--cell-size) select-none",
  weekday: "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
  weekdays: "flex",
}
interface StyleOptions {
  readonly buttonVariant: ComponentProps<typeof Button>["variant"]
  readonly captionLayout: ComponentProps<typeof DayPicker>["captionLayout"]
  readonly classNames?: ComponentProps<typeof DayPicker>["classNames"]
  readonly showWeekNumber: boolean
}
export { Calendar, CalendarDayButton }
