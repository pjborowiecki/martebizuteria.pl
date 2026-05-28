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
