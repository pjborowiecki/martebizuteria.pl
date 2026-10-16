INSERT OR IGNORE INTO courier (id, internal_code, is_active, logo, name, created_at, updated_at) VALUES
('019f4a10-0000-7000-8000-000000000001', 'inpost', 1, NULL, 'InPost', unixepoch() * 1000, unixepoch() * 1000),
('019f4a10-0000-7000-8000-000000000002', 'marte-atelier', 1, NULL, 'M''ARTE Atelier', unixepoch() * 1000, unixepoch() * 1000);

INSERT OR IGNORE INTO delivery_method (id, api_service_code, courier_id, description, is_active, name, names, price, type, created_at, updated_at) VALUES
(
  '019f4a10-0001-7000-8000-000000000001',
  'inpost_locker_standard',
  '019f4a10-0000-7000-8000-000000000001',
  'Odbiór w Paczkomacie InPost, doręczenie do 4 dni roboczych od nadania.',
  1,
  'Paczkomat InPost',
  '{"pl-PL":"Paczkomat InPost","en-US":"InPost parcel locker"}',
  1499,
  'locker',
  unixepoch() * 1000,
  unixepoch() * 1000
),
(
  '019f4a10-0001-7000-8000-000000000002',
  'inpost_courier_standard',
  '019f4a10-0000-7000-8000-000000000001',
  'Kurier InPost, doręczenie do 4 dni roboczych od nadania.',
  1,
  'Kurier InPost',
  '{"pl-PL":"Kurier InPost","en-US":"InPost courier"}',
  1999,
  'courier',
  unixepoch() * 1000,
  unixepoch() * 1000
),
(
  '019f4a10-0001-7000-8000-000000000003',
  'marte_atelier_pickup',
  '019f4a10-0000-7000-8000-000000000002',
  'Odbiór osobisty w pracowni w Bochni, gotowe najpóźniej z upływem czasu realizacji.',
  1,
  'Odbiór w atelier',
  '{"pl-PL":"Odbiór w atelier","en-US":"Pickup at the atelier"}',
  0,
  'in_store',
  unixepoch() * 1000,
  unixepoch() * 1000
);
