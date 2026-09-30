UPDATE product_collection
SET short_descriptions = json_object(
  'pl-PL', 'Najnowsze dodatki do naszego atelier — świeże formy i sezonowe kamienie.',
  'en-US', 'The latest additions to our atelier — fresh forms and seasonal stones.'
),
    updated_at = unixepoch() * 1000
WHERE handle = 'nowosci' AND short_descriptions IS NULL;

UPDATE product_collection
SET short_descriptions = json_object(
  'pl-PL', 'Ponadczasowa biżuteria wykonana z najwyższej próby srebra 925.',
  'en-US', 'Timeless jewelry made of the highest quality 925 silver.'
),
    updated_at = unixepoch() * 1000
WHERE handle = 'srebro-925' AND short_descriptions IS NULL;

UPDATE product_collection
SET short_descriptions = json_object(
  'pl-PL', 'Kolekcja złotej biżuterii próby 585, stworzona by trwać.',
  'en-US', 'A collection of 585 gold jewelry, created to last.'
),
    updated_at = unixepoch() * 1000
WHERE handle = 'zloto-585' AND short_descriptions IS NULL;
