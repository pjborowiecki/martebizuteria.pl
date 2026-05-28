INSERT INTO collection (id, handle, title, image, seo_title, seo_description, created_at, updated_at) VALUES 
('coll_1', 'summer-collection', 'Kolekcja Letnia', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Kolekcja Letnia', 'Biżuteria na lato', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('coll_2', 'winter-collection', 'Kolekcja Zimowa', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Kolekcja Zimowa', 'Biżuteria na zimę', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('coll_3', 'classic-jewelry', 'Klasyczna Biżuteria', 'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.jpg', 'Klasyczna Biżuteria', 'Tradycyjna biżuteria', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  title=excluded.title,
  handle=excluded.handle,
  image=excluded.image,
  seo_title=excluded.seo_title,
  seo_description=excluded.seo_description,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
