-- Depends on product-variants.sql.

DELETE FROM inventory
WHERE id NOT IN (
  '019e99eb-0c52-734e-a734-bfdd8f764517',
  '019e99f4-b615-72a8-ba2d-c8499e405ee0'
)
AND variant_id IN (
  '019e99eb-0c52-734e-a734-b9c6133206e4',
  '019e99f4-b615-72a8-ba2d-c72720af74ed'
);

INSERT INTO inventory (id, variant_id, quantity_available, quantity_reserved, version, created_at, updated_at) VALUES
(
  '019e99eb-0c52-734e-a734-bfdd8f764517',
  '019e99eb-0c52-734e-a734-b9c6133206e4',
  99,
  0,
  1,
  1780698778000,
  1780698778000
),
(
  '019e99f4-b615-72a8-ba2d-c8499e405ee0',
  '019e99f4-b615-72a8-ba2d-c72720af74ed',
  99,
  0,
  1,
  1780699412000,
  1780699412000
)
ON CONFLICT(id) DO UPDATE SET
  variant_id = excluded.variant_id,
  quantity_available = excluded.quantity_available,
  quantity_reserved = excluded.quantity_reserved,
  version = excluded.version,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
