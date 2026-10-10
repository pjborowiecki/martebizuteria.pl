UPDATE `delivery_method`
SET
  `description` = 'Odbiór w Paczkomacie InPost, doręczenie do 4 dni roboczych od nadania.',
  `updated_at` = unixepoch() * 1000
WHERE `description` = 'Odbiór w Paczkomacie InPost, 1-2 dni robocze.';

UPDATE `delivery_method`
SET
  `description` = 'Kurier InPost, doręczenie do 4 dni roboczych od nadania.',
  `updated_at` = unixepoch() * 1000
WHERE `description` = 'Kurier InPost, dostawa 1-2 dni robocze.';

UPDATE `delivery_method`
SET
  `description` = 'Odbiór osobisty w pracowni w Bochni, gotowe najpóźniej z upływem czasu realizacji.',
  `updated_at` = unixepoch() * 1000
WHERE `description` = 'Odbiór osobisty w atelier w Warszawie, gotowe w 24 godziny.';
