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
