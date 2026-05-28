INSERT INTO delivery_method (id, courier_id, name, type, api_service_code, price, description, is_active, created_at, updated_at) VALUES 
('method_dpd_courier', 'courier_dpd', 'Kurier DPD', 'courier', 'dpd_courier', 1500, 'Szybka dostawa kurierem pod wskazany adres', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('method_inpost_locker', 'courier_inpost', 'Paczkomaty InPost', 'locker', 'inpost_locker_standard', 1200, 'Odbierz wygodnie w wybranym Paczkomacie', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
('method_local_pickup', 'courier_local', 'Odbiór Osobisty', 'in_store', 'local_pickup', 0, 'Odbierz zamówienie w naszym butiku', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(id) DO UPDATE SET 
  name=excluded.name, 
  price=excluded.price, 
  description=excluded.description, 
  is_active=excluded.is_active,
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
