import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { deliveryMethodAccessors } from "~/src/modules/delivery-method/delivery-method.accessors";

const getDeliveryMethods = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await deliveryMethodAccessors.getActiveDeliveryMethodsQuery();

  type DeliveryMethodWithCourier = (typeof rows)[number]["deliveryMethod"] & {
    courier: (typeof rows)[number]["courier"];
  };
  const methods: DeliveryMethodWithCourier[] = [];
  for (const row of rows) {
    methods.push({ ...row.deliveryMethod, courier: row.courier });
  }
  return methods;
});

const deliveryMethodsQueryOptions = () =>
  queryOptions({
    queryFn: () => getDeliveryMethods(),
    queryKey: CONSTANTS.QUERY_KEYS.DELIVERY_METHOD.ALL
  });

export const deliveryMethodQueries = {
  deliveryMethodsQueryOptions,
  getDeliveryMethods
};
