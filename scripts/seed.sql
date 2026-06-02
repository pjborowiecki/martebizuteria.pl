-- Auto-generated from seeds/*.sql — run: bun run db:seed

-- >>> seeds/courier.sql
INSERT INTO courier (id, name, internal_code, is_active, logo, created_at, updated_at) VALUES 
('courier_inpost', 'InPost', 'INPOST', 1, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('courier_dpd', 'DPD', 'DPD', 1, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('courier_local', 'Boutique', 'LOCAL', 1, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name,
  internal_code=excluded.internal_code,
  is_active=excluded.is_active,
  logo=excluded.logo,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
-- >>> seeds/category.sql
INSERT INTO category (id, handle, name, description, is_active, position, image, seo_title, seo_description, created_at, updated_at) VALUES 
('cat_1', 'necklaces', 'Naszyjniki', 'Piękne naszyjniki na każdą okazję', 1, 0, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Naszyjniki', 'Kategoria naszyjników', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('cat_2', 'rings', 'Pierścionki', 'Eleganckie pierścionki i obrączki', 1, 1, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Pierścionki', 'Kategoria pierścionków', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('cat_3', 'bracelets', 'Bransoletki', 'Stylowe bransoletki do każdej kreacji', 1, 2, 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Bransoletki', 'Kategoria bransoletek', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  handle=excluded.handle,
  description=excluded.description,
  is_active=excluded.is_active,
  position=excluded.position,
  image=excluded.image,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/collection.sql
-- Snapshot of production collections (export from D1). Re-run with: bun run db:seed
INSERT INTO collection (id, handle, title, description, image, metadata, rank, status, created_at, updated_at) VALUES
(
  '7e8f8416-5d18-4831-9da0-a14b5c657bc3',
  'nowosci',
  'nowości',
  'Pierwsze spojrzenie na to, co właśnie opuściło nasze warszawskie atelier. Każda forma rodzi się z umiaru — surowy minerał oprawiony w srebro próby 925, wykończony ręcznie tak, by przetrwać znacznie dłużej niż sezon. To nie premiera dla samej nowości, lecz starannie wyważony wybór projektów, które dopiero zaczynają swoją historię. Odkryj je, zanim staną się Twoją codziennością.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/efe53b1e9eddb9c2f16902d97df4d9b78279fae93cdf768a36be90bfbc7e8e30.jpg',
  NULL,
  0,
  'active',
  1780337468000,
  1780489107943
),
(
  '12a56afa-1b17-4009-b384-94f03f532d20',
  'serbro-925',
  'Serbro 925',
  'Nasza flagowa kolekcja i punkt, w którym zaczyna się M''ARTE. Srebro próby 925 to nasze płótno — kruszec, który pięknie współpracuje ze światłem i z czasem staje się coraz bardziej Twój. Każdą formę ręcznie dopracowują rzemieślnicy z wieloletnim doświadczeniem, łącząc klasyczną technikę jubilerską z nowoczesną, surową prostotą. To biżuteria projektowana, by trwać — nie na jeden sezon, lecz na lata codziennego noszenia.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/5360d92c54b4db681eaf198212610a0736192220dfcc372301a89af77db46063.webp',
  NULL,
  1,
  'active',
  1780354393000,
  1780489107943
),
(
  '4ec5265b-d4bb-41ed-a9a3-eddd528fca85',
  'zloto-585',
  'złoto 585',
  'Gdy szukasz ciepła, którego nie da srebro — i formy, która zostaje z Tobą na lata. Biżuteria z kruszcu próby 585, starannie opracowana w naszym atelier: ta sama ręczna precyzja, ta sama surowa estetyka, w szlachetnym, ciepłym blasku złota. Każdy detal jest dopracowany tak, by stać się częścią Twojego wizerunku — nie chwilowym dodatkiem, lecz trwałą inwestycją w elegancję, która nie potrzebuje głośnych słów.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/e9620ce774b98a40f3847521eff6214394b9ae88f96f62bcbf5b4f3ae98b540c.webp',
  NULL,
  2,
  'draft',
  1780494472000,
  1780494472000
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  title = excluded.title,
  description = excluded.description,
  image = excluded.image,
  metadata = excluded.metadata,
  rank = excluded.rank,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- >>> seeds/product.sql
INSERT INTO product (id, handle, title, description, status, category_id, collection_id, thumbnail, images, seo_title, seo_description, tags, created_at, updated_at) VALUES 
('prod_1', 'zloty-naszyjnik', 'Złoty Naszyjnik Celebrytka', 'Piękny złoty naszyjnik próby 585.', 'published', 'cat_1', '4ec5265b-d4bb-41ed-a9a3-eddd528fca85', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Złoty Naszyjnik Celebrytka', 'Elegancki złoty naszyjnik próby 585', '["bestseller", "naszyjnik"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('prod_2', 'diamentowy-pierscionek', 'Pierścionek z Diamentem', 'Ekskluzywny pierścionek zaręczynowy z brylantem.', 'published', 'cat_2', '4ec5265b-d4bb-41ed-a9a3-eddd528fca85', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Pierścionek z Diamentem', 'Najpiękniejszy pierścionek z brylantem', '["premium", "pierścionek"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('prod_3', 'srebrna-bransoletka', 'Srebrna Bransoletka', 'Klasyczna srebrna bransoletka próby 925.', 'published', 'cat_3', '12a56afa-1b17-4009-b384-94f03f532d20', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Srebrna Bransoletka', 'Klasyczna bransoletka 925', '["bransoletka"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('prod_4', 'naszyjnik-perly', 'Naszyjnik z Pereł', 'Klasyczny naszyjnik z prawdziwych pereł.', 'published', 'cat_1', '12a56afa-1b17-4009-b384-94f03f532d20', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Naszyjnik z Pereł', 'Perły hodowlane', '["perły", "premium"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('prod_5', 'pierscionek-z-szafirem', 'Pierścionek z Szafirem', 'Elegancki pierścionek ze złota z naturalnym szafirem.', 'published', 'cat_2', '4ec5265b-d4bb-41ed-a9a3-eddd528fca85', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Pierścionek z Szafirem', 'Złoty pierścionek 585 szafir', '["bestseller"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('prod_6', 'zlota-bransoletka', 'Złota Bransoletka', 'Delikatna, pleciona złota bransoletka.', 'published', 'cat_3', '7e8f8416-5d18-4831-9da0-a14b5c657bc3', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', '["https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg", "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder2.jpg"]', 'Złota Bransoletka', 'Pleciona bransoletka ze złota', '["nowość"]', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  handle=excluded.handle,
  title=excluded.title, 
  description=excluded.description,
  status=excluded.status,
  category_id=excluded.category_id,
  collection_id=excluded.collection_id,
  thumbnail=excluded.thumbnail,
  images=excluded.images,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  tags=excluded.tags,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/product_option.sql
INSERT INTO product_option (id, product_id, title, created_at, updated_at) VALUES 
('opt_1', 'prod_1', 'Rozmiar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('opt_2', 'prod_2', 'Rozmiar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  title=excluded.title,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/product_option_value.sql
INSERT INTO product_option_value (id, option_id, variant_id, value, created_at, updated_at) VALUES 
('optval_1', 'opt_1', 'var_1', 'Uniwersalny', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('optval_2', 'opt_2', 'var_2', '10', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  value=excluded.value,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/product_variant.sql
INSERT INTO product_variant (id, product_id, title, sku, price, compare_at_price, manage_inventory, barcode, weight, created_at, updated_at) VALUES 
('var_1', 'prod_1', 'Default', 'MRT-001', 34000, NULL, 1, '893450001', 5.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_2', 'prod_2', 'Default', 'MRT-002', 120000, 150000, 1, '893450002', 4.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_3', 'prod_3', 'Default', 'MRT-003', 28000, NULL, 1, '893450003', 6.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_4', 'prod_4', 'Default', 'MRT-004', 45000, NULL, 1, '893450004', 12.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_5', 'prod_5', 'Default', 'MRT-005', 95000, 110000, 1, '893450005', 3.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_6', 'prod_6', 'Default', 'MRT-006', 42000, NULL, 1, '893450006', 7.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  title=excluded.title,
  sku=excluded.sku,
  price=excluded.price,
  compare_at_price=excluded.compare_at_price,
  manage_inventory=excluded.manage_inventory,
  barcode=excluded.barcode,
  weight=excluded.weight,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/inventory.sql
INSERT INTO inventory (id, variant_id, quantity_available, quantity_reserved, version, created_at, updated_at) VALUES 
('inv_1', 'var_1', 10, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('inv_2', 'var_2', 3, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('inv_3', 'var_3', 15, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('inv_4', 'var_4', 5, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('inv_5', 'var_5', 2, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('inv_6', 'var_6', 8, 0, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  quantity_available=excluded.quantity_available,
  quantity_reserved=excluded.quantity_reserved,
  version=excluded.version,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/delivery_method.sql
INSERT INTO delivery_method (id, courier_id, name, type, api_service_code, price, description, is_active, created_at, updated_at) VALUES 
('method_dpd_courier', 'courier_dpd', 'Kurier DPD', 'courier', 'dpd_courier', 1500, 'Szybka dostawa kurierem pod wskazany adres', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('method_inpost_locker', 'courier_inpost', 'Paczkomaty InPost', 'locker', 'inpost_locker_standard', 1200, 'Odbierz wygodnie w wybranym Paczkomacie', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('method_local_pickup', 'courier_local', 'Odbiór Osobisty', 'in_store', 'local_pickup', 0, 'Odbierz zamówienie w naszym butiku', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  price=excluded.price, 
  description=excluded.description, 
  is_active=excluded.is_active,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

-- >>> seeds/discount.sql
INSERT INTO discount (id, code, type, value, is_active, usage_count, created_at, updated_at) VALUES 
('disc_1', 'WELCOME10', 'percentage', 10, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('disc_2', 'FREESHIPPING', 'free_shipping', 0, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('disc_3', 'MINUS50', 'fixed_amount', 5000, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(code) DO UPDATE SET 
  type=excluded.type,
  value=excluded.value,
  is_active=excluded.is_active,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
