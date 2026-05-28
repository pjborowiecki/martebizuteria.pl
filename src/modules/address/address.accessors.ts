import { eq, sql } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { address } from "~/src/modules/address/address.schema";

const getAllUserAddressesQuery = db.query.address
  .findMany({
    where: eq(address.userId, sql.placeholder("userId"))
  })
  .prepare();

export const addressAccessors = {
  getAllUserAddressesQuery
};
