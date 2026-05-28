INSERT INTO product_variant (id, product_id, title, sku, price, compare_at_price, manage_inventory, barcode, weight, created_at, updated_at) VALUES 
('var_1', 'prod_1', 'Default', 'MRT-001', 34000, NULL, 1, '893450001', 5.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_2', 'prod_2', 'Default', 'MRT-002', 120000, 150000, 1, '893450002', 4.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_3', 'prod_3', 'Default', 'MRT-003', 28000, NULL, 1, '893450003', 6.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_4', 'prod_4', 'Default', 'MRT-004', 45000, NULL, 1, '893450004', 12.0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_5', 'prod_5', 'Default', 'MRT-005', 95000, 110000, 1, '893450005', 3.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('var_6', 'prod_6', 'Default', 'MRT-006', 42000, NULL, 1, '893450006', 7.5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  title=excluded.title,
  sku=excluded.sku,
  price=excluded.price,
  compare_at_price=excluded.compare_at_price,
  manage_inventory=excluded.manage_inventory,
  barcode=excluded.barcode,
  weight=excluded.weight,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
