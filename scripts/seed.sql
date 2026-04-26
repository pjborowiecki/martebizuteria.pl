INSERT INTO collection (id, handle, title, created_at, updated_at) VALUES 
('coll_1', 'summer-collection', 'Kolekcja Letnia', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('coll_2', 'winter-collection', 'Kolekcja Zimowa', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('coll_3', 'classic-jewelry', 'Klasyczna Biżuteria', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET title=excluded.title;

INSERT INTO category (id, handle, name, description, is_active, position, created_at, updated_at) VALUES 
('cat_1', 'necklaces', 'Naszyjniki', 'Piękne naszyjniki na każdą okazję', 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('cat_2', 'rings', 'Pierścionki', 'Eleganckie pierścionki i obrączki', 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('cat_3', 'bracelets', 'Bransoletki', 'Stylowe bransoletki do każdej kreacji', 1, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description;

INSERT INTO product (id, handle, title, description, status, category_id, collection_id, created_at, updated_at, thumbnail) VALUES 
('prod_1', 'zloty-naszyjnik', 'Złoty Naszyjnik Celebrytka', 'Piękny złoty naszyjnik próby 585.', 'published', 'cat_1', 'coll_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1599643478524-fb66f70d00ea?q=80&w=640&auto=format&fit=crop'),
('prod_2', 'diamentowy-pierscionek', 'Pierścionek z Diamentem', 'Ekskluzywny pierścionek zaręczynowy z brylantem.', 'published', 'cat_2', 'coll_3', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1605100804763-247f67341cb8?q=80&w=640&auto=format&fit=crop'),
('prod_3', 'srebrna-bransoletka', 'Srebrna Bransoletka', 'Klasyczna srebrna bransoletka próby 925.', 'published', 'cat_3', 'coll_2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=640&auto=format&fit=crop'),
('prod_4', 'naszyjnik-perly', 'Naszyjnik z Pereł', 'Klasyczny naszyjnik z prawdziwych pereł.', 'published', 'cat_1', 'coll_3', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?q=80&w=640&auto=format&fit=crop'),
('prod_5', 'pierscionek-z-szafirem', 'Pierścionek z Szafirem', 'Elegancki pierścionek ze złota z naturalnym szafirem.', 'published', 'cat_2', 'coll_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1605100804763-247f67341cb8?q=80&w=640&auto=format&fit=crop'),
('prod_6', 'zlota-bransoletka', 'Złota Bransoletka', 'Delikatna, pleciona złota bransoletka.', 'published', 'cat_3', 'coll_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=640&auto=format&fit=crop')
ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description;
