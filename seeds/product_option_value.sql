INSERT INTO product_option_value (id, option_id, variant_id, value, created_at, updated_at) VALUES 
('optval_1', 'opt_1', 'var_1', 'Uniwersalny', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('optval_2', 'opt_2', 'var_2', '10', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  value=excluded.value,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
