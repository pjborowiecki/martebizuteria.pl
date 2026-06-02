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
