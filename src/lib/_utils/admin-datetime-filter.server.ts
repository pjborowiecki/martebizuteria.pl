import { and, gte, lte, sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

import { DATE_COLUMN_FILTER_OPERATOR, type DateTimeColumnFilterValue } from "~/src/lib/_utils/admin-datetime-filter";
import { parseIsoDateTimeLocalToEndMs, parseIsoDateTimeLocalToMs } from "~/src/lib/_utils/iso-datetime";

export function buildAdminDateTimeFilterSql(column: AnySQLiteColumn, filter: DateTimeColumnFilterValue): SQL {
  switch (filter.operator) {
    case DATE_COLUMN_FILTER_OPERATOR.ON: {
      if (filter.date === undefined) {
        return sql`1 = 1`;
      }

      return and(
        gte(column, new Date(parseIsoDateTimeLocalToMs(filter.date))),
        lte(column, new Date(parseIsoDateTimeLocalToEndMs(filter.date)))
      )!;
    }
    case DATE_COLUMN_FILTER_OPERATOR.BEFORE: {
      if (filter.date === undefined) {
        return sql`1 = 1`;
      }

      return sql`${column} < ${new Date(parseIsoDateTimeLocalToMs(filter.date))}`;
    }
    case DATE_COLUMN_FILTER_OPERATOR.AFTER: {
      if (filter.date === undefined) {
        return sql`1 = 1`;
      }

      return sql`${column} > ${new Date(parseIsoDateTimeLocalToEndMs(filter.date))}`;
    }
    case DATE_COLUMN_FILTER_OPERATOR.BETWEEN: {
      if (filter.startDate === undefined || filter.endDate === undefined) {
        return sql`1 = 1`;
      }

      return and(
        gte(column, new Date(parseIsoDateTimeLocalToMs(filter.startDate))),
        lte(column, new Date(parseIsoDateTimeLocalToEndMs(filter.endDate)))
      )!;
    }
    default: {
      return sql`1 = 1`;
    }
  }
}
