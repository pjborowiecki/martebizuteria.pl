INSERT OR IGNORE INTO courier (id, internal_code, is_active, logo, name, created_at, updated_at) VALUES
('019f4a10-0000-7000-8000-000000000001', 'inpost', 1, NULL, 'InPost', unixepoch() * 1000, unixepoch() * 1000),
('019f4a10-0000-7000-8000-000000000002', 'marte-atelier', 1, NULL, 'M''ARTE Atelier', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO delivery_method (id, api_service_code, courier_id, description, is_active, name, price, type, created_at, updated_at) VALUES
(
  '019f4a10-0001-7000-8000-000000000001',
  'inpost_locker_standard',
  '019f4a10-0000-7000-8000-000000000001',
  'Odbiór w Paczkomacie InPost, 1-2 dni robocze.',
  1,
  'Paczkomat InPost',
  1499,
  'locker',
  unixepoch() * 1000,
  unixepoch() * 1000
),
(
  '019f4a10-0001-7000-8000-000000000002',
  'inpost_courier_standard',
  '019f4a10-0000-7000-8000-000000000001',
  'Kurier InPost, dostawa 1-2 dni robocze.',
  1,
  'Kurier InPost',
  1999,
  'courier',
  unixepoch() * 1000,
  unixepoch() * 1000
),
(
  '019f4a10-0001-7000-8000-000000000003',
  'marte_atelier_pickup',
  '019f4a10-0000-7000-8000-000000000002',
  'Odbiór osobisty w atelier w Warszawie, gotowe w 24 godziny.',
  1,
  'Odbiór w atelier',
  0,
  'in_store',
  unixepoch() * 1000,
  unixepoch() * 1000
);
