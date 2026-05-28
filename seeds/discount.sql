INSERT INTO discount (id, code, type, value, is_active, usage_count, created_at, updated_at) VALUES 
('disc_1', 'WELCOME10', 'percentage', 10, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('disc_2', 'FREESHIPPING', 'free_shipping', 0, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('disc_3', 'MINUS50', 'fixed_amount', 5000, 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(code) DO UPDATE SET 
  type=excluded.type,
  value=excluded.value,
  is_active=excluded.is_active,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
