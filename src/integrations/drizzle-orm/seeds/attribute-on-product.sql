-- Depends on products.sql and product-attributes.sql.

DELETE FROM attribute_on_product
WHERE product_id IN (
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427'
)
AND id NOT IN (
  '019e99e3-6023-75d2-af35-c2934cbd2d41',
  '019e99ea-13b4-762c-8040-570ef448373e',
  '019e99ea-8549-704b-bdad-74a80ba5a2a6',
  '019e99ea-8549-704b-bdad-7a014792cc4a',
  '019e99eb-0d40-7168-9c5c-62187f1b3401',
  '019e99f2-e335-73eb-af74-82ecc0596024',
  '019e99f4-b721-740b-9bfb-2a8001c3c382',
  '019e99f4-b721-740b-9bfb-2e2e2cedebfa',
  '019e99f4-b721-740b-9bfb-3155e7ba4382',
  '019e99f4-b721-740b-9bfb-341ab5b2218f'
);

INSERT INTO attribute_on_product (id, product_id, attribute_id, value, rank, created_at, updated_at) VALUES
(
  '019e99e3-6023-75d2-af35-c2934cbd2d41',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e9804-1ddd-771d-a1ea-c257cfb76610',
  'srebro-925',
  0,
  1780698779000,
  1780698779000
),
(
  '019e99ea-13b4-762c-8040-570ef448373e',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e988c-8603-76cd-ae1b-d2cbdef5c8f2',
  '45',
  1,
  1780698779000,
  1780698779000
),
(
  '019e99ea-8549-704b-bdad-74a80ba5a2a6',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e97fd-41ad-73a7-b2b4-2cb81ca488de',
  '["lapis-lazuli"]',
  2,
  1780698779000,
  1780698779000
),
(
  '019e99ea-8549-704b-bdad-7a014792cc4a',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e9892-380f-738c-aa5d-07c4fd10c92a',
  '20-x-15-mm',
  3,
  1780698779000,
  1780698779000
),
(
  '019e99eb-0d40-7168-9c5c-62187f1b3401',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e9801-c89f-714f-b66f-70888985f4e8',
  '10-dni-roboczych',
  4,
  1780698779000,
  1780698779000
),
(
  '019e99f2-e335-73eb-af74-82ecc0596024',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  '019e9804-1ddd-771d-a1ea-c257cfb76610',
  'srebro-925',
  0,
  1780699412000,
  1780699412000
),
(
  '019e99f4-b721-740b-9bfb-2a8001c3c382',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  '019e988c-8603-76cd-ae1b-d2cbdef5c8f2',
  '45',
  1,
  1780699412000,
  1780699412000
),
(
  '019e99f4-b721-740b-9bfb-2e2e2cedebfa',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  '019e97fd-41ad-73a7-b2b4-2cb81ca488de',
  '["onyks"]',
  2,
  1780699412000,
  1780699412000
),
(
  '019e99f4-b721-740b-9bfb-3155e7ba4382',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  '019e9892-380f-738c-aa5d-07c4fd10c92a',
  '20-x-15-mm',
  3,
  1780699412000,
  1780699412000
),
(
  '019e99f4-b721-740b-9bfb-341ab5b2218f',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  '019e9801-c89f-714f-b66f-70888985f4e8',
  '10-dni-roboczych',
  4,
  1780699412000,
  1780699412000
)
ON CONFLICT(id) DO UPDATE SET
  product_id = excluded.product_id,
  attribute_id = excluded.attribute_id,
  value = excluded.value,
  rank = excluded.rank,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
