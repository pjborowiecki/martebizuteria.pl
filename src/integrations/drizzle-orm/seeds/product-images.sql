-- Depends on products.sql.

DELETE FROM product_image
WHERE product_id IN (
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427'
)
AND id NOT IN (
  '9afb6c52-601f-4a34-876b-54b7dd72c356',
  '1a33e5e0-2562-4abd-b1a5-6777a8c364c2',
  '1b4280b3-0396-41ae-918f-60337873c74a',
  '582558ba-f61d-487e-aa53-6de07a6720ed',
  'a1327075-fbea-49f1-8c5d-295827dfd086'
);

INSERT INTO product_image (id, product_id, url, alt, rank, created_at, updated_at) VALUES
(
  '9afb6c52-601f-4a34-876b-54b7dd72c356',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/b9b19fc785f25907772aee2cf6d046f2d44b4cf7939d78828c7371c95a9089cc.webp',
  NULL,
  0,
  1780698779000,
  1780698779000
),
(
  '1a33e5e0-2562-4abd-b1a5-6777a8c364c2',
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/a397d715a35570689ae92f687345bc63a8ed06592c2e7239d56ecb478440cabc.webp',
  NULL,
  1,
  1780698779000,
  1780698779000
),
(
  '1b4280b3-0396-41ae-918f-60337873c74a',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/425e292cb1e1d1297839fc232ab4e9f978d1ecfa2e68477c457d1cf1929e3a35.webp',
  NULL,
  0,
  1780699412000,
  1780699412000
),
(
  '582558ba-f61d-487e-aa53-6de07a6720ed',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/e9620ce774b98a40f3847521eff6214394b9ae88f96f62bcbf5b4f3ae98b540c.webp',
  NULL,
  1,
  1780699412000,
  1780699412000
),
(
  'a1327075-fbea-49f1-8c5d-295827dfd086',
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/0d9175f1c3c34d2e0c0af3f6b0020f9b6ee7b21062c846d03a87b8716bbd489a.webp',
  NULL,
  2,
  1780699412000,
  1780699412000
)
ON CONFLICT(id) DO UPDATE SET
  product_id = excluded.product_id,
  url = excluded.url,
  alt = excluded.alt,
  rank = excluded.rank,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
