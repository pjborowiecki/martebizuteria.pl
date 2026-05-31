import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "~/src/integrations/better-auth/auth._server";

import { addressAccessors } from "~/src/modules/address/address.accessors";

const fetchUserAddressesFn = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return [];
  }

  return addressAccessors.getAllUserAddressesQuery.execute({ userId: session.user.id });
});

export const addressQueries = {
  fetchUserAddressesFn
};

export const addressQueryOptions = {
  userAddressesQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchUserAddressesFn(),
      queryKey: ["userAddresses"]
    })
};
