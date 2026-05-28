INSERT INTO product_option (id, product_id, title, created_at, updated_at) VALUES 
('opt_1', 'prod_1', 'Rozmiar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('opt_2', 'prod_2', 'Rozmiar', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  title=excluded.title,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
