const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_DATE_PART_WIDTH = 2;
const END_OF_DAY_HOUR = 23;
const END_OF_DAY_MINUTE = 59;
const END_OF_DAY_SECOND = 59;
const END_OF_DAY_MILLISECOND = 999;
const MONTH_OFFSET = 1;

export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsed = new Date(year, month - MONTH_OFFSET, day);

  return parsed.getFullYear() === year && parsed.getMonth() === month - MONTH_OFFSET && parsed.getDate() === day;
}

export function parseIsoDateToLocalDate(isoDate: string): Date {
  const [yearPart, monthPart, dayPart] = isoDate.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  return new Date(year, month - MONTH_OFFSET, day);
}

export function parseIsoDateToStartMs(isoDate: string): number {
  return parseIsoDateToLocalDate(isoDate).getTime();
}

export function parseIsoDateToEndMs(isoDate: string): number {
  const [yearPart, monthPart, dayPart] = isoDate.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  return new Date(year, month - MONTH_OFFSET, day, END_OF_DAY_HOUR, END_OF_DAY_MINUTE, END_OF_DAY_SECOND, END_OF_DAY_MILLISECOND).getTime();
}

export function formatDateToIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + MONTH_OFFSET).padStart(ISO_DATE_PART_WIDTH, "0");
  const day = String(date.getDate()).padStart(ISO_DATE_PART_WIDTH, "0");
  return `${year}-${month}-${day}`;
}
