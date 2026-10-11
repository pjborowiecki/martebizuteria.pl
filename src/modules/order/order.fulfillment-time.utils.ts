import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type FulfillmentTimeAttribute } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import { type FulfillmentLine } from "~/src/modules/checkout/checkout.utils"
import { formatProductAttributeValueForDisplay } from "~/src/modules/product-attribute/product-attribute.utils"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"

export const resolveOrderLineFulfillmentTimes = (
  lines: readonly FulfillmentLine[],
  attributesByVariantId: ReadonlyMap<string, FulfillmentTimeAttribute>,
  locale: SupportedLocale,
): OrderLineFulfillmentTime[] =>
  lines.map((line) => {
    const attribute = attributesByVariantId.get(line.variantId)

    return {
      time:
        attribute === undefined
          ? undefined
          : formatProductAttributeValueForDisplay(attribute.type, attribute.value, {
              allowedValues: attribute.allowedValues,
              locale,
              unit: attribute.unit,
            }),
      title: line.title,
    }
  })

const measureFulfillmentTimeSegment = (segment: string): number[] => {
  const count = FULFILLMENT_TIME_COUNT_PATTERN.exec(segment)?.[0]
  const unit = FULFILLMENT_TIME_UNITS.find((candidate) => candidate.pattern.test(segment))
  if (count === undefined || unit === undefined) {
    return []
  }

  return [Number(count.replace(",", ".")) * unit.calendarDays]
}

const measureFulfillmentTimeInCalendarDays = (time: string): number | undefined => {
  const lengths = time.split(FULFILLMENT_TIME_SEGMENT_START).flatMap((segment) => measureFulfillmentTimeSegment(segment))

  return lengths.length === 0 ? undefined : Math.max(...lengths)
}

export const describeOrderFulfillmentTime = (
  lines: readonly OrderLineFulfillmentTime[],
  messages: typeof orderConfirmationMessages,
): string => {
  const { fallback, note } = messages.fulfillmentTime
  const stated = lines.map((line) => {
    const time = line.time ?? fallback

    return { calendarDays: measureFulfillmentTimeInCalendarDays(time), time, title: line.title }
  })
  const measured = stated.filter((line): line is MeasuredFulfillmentTime => line.calendarDays !== undefined)
  if (measured.length < stated.length) {
    return [...new Set(stated.map((line) => `${line.title}: ${line.time}`)), note].join("\n")
  }

  const [longest] = measured.toSorted((left, right) => right.calendarDays - left.calendarDays)

  return [longest === undefined ? fallback : longest.time, note].join("\n")
}

export interface OrderLineFulfillmentTime {
  readonly time: string | undefined
  readonly title: string
}

interface MeasuredFulfillmentTime {
  readonly calendarDays: number
  readonly time: string
  readonly title: string
}

const HOURS_PER_DAY = 24

const BUSINESS_DAYS_PER_WEEK = 5

const CALENDAR_DAYS_PER_WEEK = 7

const CALENDAR_DAYS_PER_MONTH = 30

const FULFILLMENT_TIME_SEGMENT_START = /(?<![\d.,])(?=\d)/u

const FULFILLMENT_TIME_COUNT_PATTERN = /^\d+(?:[.,]\d+)?/u

const FULFILLMENT_TIME_UNITS = [
  { calendarDays: 1 / HOURS_PER_DAY, pattern: /godz|hour/iu },
  { calendarDays: CALENDAR_DAYS_PER_WEEK, pattern: /tydz|tyg|week/iu },
  { calendarDays: CALENDAR_DAYS_PER_MONTH, pattern: /mies|month/iu },
  { calendarDays: CALENDAR_DAYS_PER_WEEK / BUSINESS_DAYS_PER_WEEK, pattern: /robocz|business|working/iu },
  { calendarDays: 1, pattern: /dzie|dni|day/iu },
] as const
