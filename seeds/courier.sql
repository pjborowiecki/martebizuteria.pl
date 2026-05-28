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