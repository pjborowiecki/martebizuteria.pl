DELETE FROM product_attribute
WHERE handle IN (
  'czas-realizacji',
  'kamienie',
  'zapiecie',
  'material',
  'typ',
  'powloka',
  'srednica',
  'waga-uzytego-surowca',
  'wielkosc-kamieni',
  'kolor-kamieni',
  'wymiary-elementu',
  'wielkosc-zawieszki',
  'dlugosc-przedluzki',
  'dlugosc-bransoletki',
  'dlugosc-naszyjnika'
)
AND id NOT IN (
  '019e9801-c89f-714f-b66f-70888985f4e8',
  '019e97fd-41ad-73a7-b2b4-2cb81ca488de',
  '019e980d-b8c4-72c3-bb24-04bd2a0a7a42',
  '019e9804-1ddd-771d-a1ea-c257cfb76610',
  '019e989c-127f-75d8-b753-5cae337f5af6',
  '019e986f-2f9a-75ab-bc28-82b89d9f4240',
  '019e9807-ed47-737f-a06e-d51de4b6d448',
  '019e988a-699b-745d-97e1-473ab437e9fd',
  '019e9872-e2c3-73c1-8b12-dd53ae8cca43',
  '019e9877-a188-7250-b2c8-f8a023d2bae4',
  '019e9892-380f-738c-aa5d-07c4fd10c92a',
  '019e986c-a8cb-7018-9fae-c6c3b9d3d317',
  '019e97f0-3172-70c7-b740-80f78750782f',
  '019e9879-96d8-7428-a8c1-08e824955ff3',
  '019e988c-8603-76cd-ae1b-d2cbdef5c8f2'
);

INSERT INTO product_attribute (id, handle, titles, type, unit, allowed_values, rank, created_at, updated_at) VALUES
(
  '019e9801-c89f-714f-b66f-70888985f4e8',
  'czas-realizacji',
  json_object('pl', 'Czas realizacji', 'en', 'Fulfillment Time'),
  'select',
  NULL,
  json('[{"labels":{"pl":"2 dni robocze","en":"2 business days"},"value":"2-dni-robocze"},{"labels":{"pl":"3 dni robocze","en":"3 business days"},"value":"3-dni-robocze"},{"labels":{"pl":"5 dni roboczych","en":"5 business days"},"value":"5-dni-roboczych"},{"labels":{"pl":"7 dni roboczych","en":"7 business days"},"value":"7-dni-roboczych"},{"labels":{"pl":"10 dni roboczych","en":"10 business days"},"value":"10-dni-roboczych"},{"labels":{"pl":"14 dni roboczych","en":"14 business days"},"value":"14-dni-roboczych"}]'),
  0,
  1780666714000,
  1780676836105
),
(
  '019e97fd-41ad-73a7-b2b4-2cb81ca488de',
  'kamienie',
  json_object('pl', 'Kamienie', 'en', 'Stones'),
  'multiselect',
  NULL,
  json('[{"labels":{"pl":"Bursztyn","en":"Amber"},"value":"bursztyn"},{"labels":{"pl":"Agat","en":"Agate"},"value":"agat"},{"labels":{"pl":"Cyrkonia","en":"Cubic Zirconia"},"value":"cyrkonia"},{"labels":{"pl":"Howlit","en":"Howlite"},"value":"howlit"},{"labels":{"pl":"Kamień rzeczny","en":"River Stone"},"value":"kamien-rzeczny"},{"labels":{"pl":"Koral","en":"Coral (Raw)"},"value":"koral"},{"labels":{"pl":"Koralowiec","en":"Coral (Sponge)"},"value":"koralowiec"},{"labels":{"pl":"Kwarc różowy","en":"Rose Quartz"},"value":"kwarc-rozowy"},{"labels":{"pl":"Lapis Lazuli","en":"Lapis Lazuli"},"value":"lapis-lazuli"},{"labels":{"pl":"Malachit","en":"Malachite"},"value":"malachit"},{"labels":{"pl":"Masa perłowa","en":"Mother of Pearl"},"value":"masa-perlowa"},{"labels":{"pl":"Oliwin","en":"Peridot"},"value":"oliwin"},{"labels":{"pl":"Onyks","en":"Onyx"},"value":"onyks"},{"labels":{"pl":"Perła","en":"Pearl"},"value":"perla"},{"labels":{"pl":"Perła naturalna hodowana","en":"Cultured Pearl"},"value":"perla-naturalna-hodowana"},{"labels":{"pl":"Szmaragd","en":"Emerald"},"value":"szmaragd"},{"labels":{"pl":"Turkus","en":"Turquoise"},"value":"turkus"},{"labels":{"pl":"Turkus afrykański","en":"African Turquoise"},"value":"turkus-afrykanski"},{"labels":{"pl":"Turmalin","en":"Tourmaline"},"value":"turmalin"}]'),
  1,
  1780666417000,
  1780676836105
),
(
  '019e980d-b8c4-72c3-bb24-04bd2a0a7a42',
  'zapiecie',
  json_object('pl', 'Zapięcie', 'en', 'Closure Type'),
  'select',
  NULL,
  json('[{"labels":{"pl":"Klasyczny karabińczyk","en":"Lobster Clasp"},"value":"klasyczny-karabinczyk"},{"labels":{"pl":"Typu toggle","en":"Toggle Clasp"},"value":"typu-toggle"},{"labels":{"pl":"Bigiel","en":"Ear Wire / French Hook"},"value":"bigiel"},{"labels":{"pl":"Bigiel angielski","en":"Leverback"},"value":"bigiel-angielski"},{"labels":{"pl":"Wkręt","en":"Screw Back / Screw Clasp"},"value":"wkret"},{"labels":{"pl":"Kreol","en":"Latch Back / Hinged Snap"},"value":"kreol"},{"labels":{"pl":"Sztyft","en":"Push Back / Friction Back"},"value":"sztyft"}]'),
  2,
  1780667496000,
  1780676836106
),
(
  '019e9804-1ddd-771d-a1ea-c257cfb76610',
  'material',
  json_object('pl', 'Materiał', 'en', 'Material'),
  'select',
  NULL,
  json('[{"labels":{"pl":"Srebro 925","en":"925 Sterling Silver"},"value":"srebro-925"},{"labels":{"pl":"Złoto 585","en":"14K Gold"},"value":"zloto-585"}]'),
  3,
  1780666867000,
  1780676836106
),
(
  '019e986f-2f9a-75ab-bc28-82b89d9f4240',
  'powloka',
  json_object('pl', 'Powłoka', 'en', 'Plating'),
  'select',
  NULL,
  json('[{"labels":{"pl":"14K żółte złoto (e-coating)","en":"14K Yellow Gold (E-Coating)"},"value":"14k-zolte-zloto-e-coating"},{"labels":{"pl":"Rod","en":"Rhodium"},"value":"rod"}]'),
  4,
  1780673884000,
  1780676836106
),
(
  '019e989c-127f-75d8-b753-5cae337f5af6',
  'typ',
  json_object('pl', 'Typ', 'en', 'Type'),
  'select',
  NULL,
  json('[{"labels":{"pl":"Pozłacane","en":"Gold Plated"},"value":"pozlacane"}]'),
  5,
  1780676825000,
  1780676836106
),
(
  '019e9807-ed47-737f-a06e-d51de4b6d448',
  'srednica',
  json_object('pl', 'Średnica', 'en', 'Diameter'),
  'select',
  NULL,
  json('[{"labels":{"pl":"10 mm","en":"10 mm"},"value":"10-mm"},{"labels":{"pl":"15 mm","en":"15 mm"},"value":"15-mm"},{"labels":{"pl":"20 mm","en":"20 mm"},"value":"20-mm"},{"labels":{"pl":"24 mm","en":"24 mm"},"value":"24-mm"}]'),
  6,
  1780667117000,
  1780676836046
),
(
  '019e988a-699b-745d-97e1-473ab437e9fd',
  'waga-uzytego-surowca',
  json_object('pl', 'Waga użytego surowca', 'en', 'Material weight'),
  'select',
  NULL,
  json('[{"labels":{"pl":"3 g","en":"3 g"},"value":"3-g"},{"labels":{"pl":"> 5 g","en":"> 5 g"},"value":"5-g"},{"labels":{"pl":"100 g","en":"100 g"},"value":"100-g"},{"labels":{"pl":"200 g","en":"200 g"},"value":"200-g"}]'),
  7,
  1780675668000,
  1780676836106
),
(
  '019e9872-e2c3-73c1-8b12-dd53ae8cca43',
  'wielkosc-kamieni',
  json_object('pl', 'Wielkość kamieni', 'en', 'Stone size'),
  'select',
  NULL,
  json('[{"labels":{"pl":"~ 3 mm","en":"~ 3 mm"},"value":"3-mm"},{"labels":{"pl":"~ 3 - 4 mm","en":"~ 3 - 4 mm"},"value":"3-4-mm"},{"labels":{"pl":"~ 5 mm","en":"~ 5 mm"},"value":"5-mm"},{"labels":{"pl":"~ 6 - 7 mm","en":"~ 6 - 7 mm"},"value":"6-7-mm"},{"labels":{"pl":"~ 10 mm","en":"~ 10 mm"},"value":"10-mm"}]'),
  8,
  1780674126000,
  1780676836106
),
(
  '019e9877-a188-7250-b2c8-f8a023d2bae4',
  'kolor-kamieni',
  json_object('pl', 'Kolor kamieni', 'en', 'Stone colour'),
  'multiselect',
  NULL,
  json('[{"labels":{"pl":"Kremowy","en":"Cream"},"value":"kremowy"},{"labels":{"pl":"Biały","en":"White"},"value":"bialy"},{"labels":{"pl":"Zielony","en":"Green"},"value":"zielony"},{"labels":{"pl":"Beżowy","en":"Beige"},"value":"bezowy"},{"labels":{"pl":"Czarny","en":"Black"},"value":"czarny"},{"labels":{"pl":"Wielokolorowy","en":"Multicolour"},"value":"wielokolorowy"}]'),
  9,
  1780674437000,
  1780676836107
),
(
  '019e9892-380f-738c-aa5d-07c4fd10c92a',
  'wymiary-elementu',
  json_object('pl', 'Wymiary elementu', 'en', 'Element Dimensions'),
  'select',
  NULL,
  json('[{"labels":{"pl":"20 x 12 mm","en":"20 x 12 mm"},"value":"20-x-12-mm"},{"labels":{"pl":"17 mm","en":"17 mm"},"value":"17-mm"},{"labels":{"pl":"13 x 5 mm","en":"13 x 5 mm"},"value":"13-x-5-mm"},{"labels":{"pl":"31 x 15 mm","en":"31 x 15 mm"},"value":"31-x-15-mm"},{"labels":{"pl":"15 x 13 mm","en":"15 x 13 mm"},"value":"15-x-13-mm"},{"labels":{"pl":"22 x 16 mm","en":"22 x 16 mm"},"value":"22-x-16-mm"},{"labels":{"pl":"17 x 5 mm","en":"17 x 5 mm"},"value":"17-x-5-mm"},{"labels":{"pl":"15,5 x 7 mm","en":"15,5 x 7 mm"},"value":"15-5-x-7-mm"},{"labels":{"pl":"20 x 22 mm","en":"20 x 22 mm"},"value":"20-x-22-mm"},{"labels":{"pl":"20 x 15 mm","en":"20 x 15 mm"},"value":"20-x-15-mm"},{"labels":{"pl":"21 x 17 mm","en":"21 x 17 mm"},"value":"21-x-17-mm"}]'),
  10,
  1780676180000,
  1780676836107
),
(
  '019e986c-a8cb-7018-9fae-c6c3b9d3d317',
  'wielkosc-zawieszki',
  json_object('pl', 'Wielkość zawieszki', 'en', 'Pendant Size'),
  'select',
  NULL,
  json('[{"labels":{"pl":"24 mm","en":"24 mm"},"value":"24-mm"},{"labels":{"pl":"30 mm","en":"30 mm"},"value":"30-mm"},{"labels":{"pl":"2 cm","en":"2 cm"},"value":"2-cm"},{"labels":{"pl":"3 cm","en":"3 cm"},"value":"3-cm"},{"labels":{"pl":"14 x 17 mm","en":"14 x 17 mm"},"value":"14-x-17-mm"},{"labels":{"pl":"19 x 20 mm","en":"19 x 20 mm"},"value":"19-x-20-mm"},{"labels":{"pl":"35 x 21 mm","en":"35 x 21 mm"},"value":"35-x-21-mm"}]'),
  11,
  1780673718000,
  1780676836107
),
(
  '019e97f0-3172-70c7-b740-80f78750782f',
  'dlugosc-przedluzki',
  json_object('pl', 'Długość przedłużki', 'en', 'Extension length'),
  'number',
  'cm',
  json('[{"labels":{"pl":"3 cm","en":"3 cm"},"value":"3-cm"}]'),
  12,
  1780665561000,
  1780676836107
),
(
  '019e9879-96d8-7428-a8c1-08e824955ff3',
  'dlugosc-bransoletki',
  json_object('pl', 'Długość bransoletki', 'en', 'Bracelet Length'),
  'number',
  'cm',
  NULL,
  13,
  1780674566000,
  1780676836107
),
(
  '019e988c-8603-76cd-ae1b-d2cbdef5c8f2',
  'dlugosc-naszyjnika',
  json_object('pl', 'Długość naszyjnika', 'en', 'Necklace Length'),
  'number',
  'cm',
  NULL,
  14,
  1780675806000,
  1780676836107
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  titles = excluded.titles,
  type = excluded.type,
  unit = excluded.unit,
  allowed_values = excluded.allowed_values,
  rank = excluded.rank,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
