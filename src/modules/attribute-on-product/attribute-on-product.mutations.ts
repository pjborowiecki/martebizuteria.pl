import { createServerFn } from "@tanstack/react-start";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { replaceAllAttributesForProduct, replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils";
import { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod";

const setForProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => attributeOnProductZodSchemas.setForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    await replaceAttributesForProduct(data.productId, data.values);

    return { ok: true, productId: data.productId };
  });

const setAllForProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => attributeOnProductZodSchemas.setAllForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    await replaceAllAttributesForProduct(
      data.productId,
      data.productValues,
      data.variantValues.map((group) => ({ rows: group.values, variantId: group.variantId }))
    );

    return { ok: true, productId: data.productId };
  });

export const attributeOnProductMutations = {
  setAllForProductFn,
  setForProductFn
};
