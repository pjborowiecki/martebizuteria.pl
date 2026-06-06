-- Depends on products.sql.

DELETE FROM product_variant
WHERE sku IN ('MRT-0001', 'MRT-0002')
  AND id NOT IN (
    '019e99eb-0c52-734e-a734-b9c6133206e4',
    '019e99f4-b615-72a8-ba2d-c72720af74ed'
  );

INSERT INTO product_variant (id, product_id, title, sku, price, compare_at_price, manage_inventory, barcode, metadata, created_at, updated_at) VALUES
(
  '019e99eb-0c52-734e-a734-b9c6133206e4',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  'Default',
  'MRT-0001',
  37900,
  NULL,
  1,
  NULL,
  NULL,
  1780698778000,
  1780698778000
),
(
  '019e99f4-b615-72a8-ba2d-c72720af74ed',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  'Default',
  'MRT-0002',
  37900,
  NULL,
  1,
  NULL,
  NULL,
  1780699412000,
  1780699412000
)
ON CONFLICT(id) DO UPDATE SET
  product_id = excluded.product_id,
  title = excluded.title,
  sku = excluded.sku,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  manage_inventory = excluded.manage_inventory,
  barcode = excluded.barcode,
  metadata = excluded.metadata,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
