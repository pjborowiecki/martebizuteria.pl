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
  json_object('pl-PL', 'Czas realizacji', 'en-US', 'Fulfillment Time'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"2 dni robocze","en-US":"2 business days"},"value":"2-dni-robocze"},{"labels":{"pl-PL":"3 dni robocze","en-US":"3 business days"},"value":"3-dni-robocze"},{"labels":{"pl-PL":"5 dni roboczych","en-US":"5 business days"},"value":"5-dni-roboczych"},{"labels":{"pl-PL":"7 dni roboczych","en-US":"7 business days"},"value":"7-dni-roboczych"},{"labels":{"pl-PL":"10 dni roboczych","en-US":"10 business days"},"value":"10-dni-roboczych"},{"labels":{"pl-PL":"14 dni roboczych","en-US":"14 business days"},"value":"14-dni-roboczych"}]'),
  0,
  1780666714000,
  1780676836105
),
(
  '019e97fd-41ad-73a7-b2b4-2cb81ca488de',
  'kamienie',
  json_object('pl-PL', 'Kamienie', 'en-US', 'Stones'),
  'multiselect',
  NULL,
  json('[{"labels":{"pl-PL":"Bursztyn","en-US":"Amber"},"value":"bursztyn"},{"labels":{"pl-PL":"Agat","en-US":"Agate"},"value":"agat"},{"labels":{"pl-PL":"Cyrkonia","en-US":"Cubic Zirconia"},"value":"cyrkonia"},{"labels":{"pl-PL":"Howlit","en-US":"Howlite"},"value":"howlit"},{"labels":{"pl-PL":"Kamień rzeczny","en-US":"River Stone"},"value":"kamien-rzeczny"},{"labels":{"pl-PL":"Koral","en-US":"Coral (Raw)"},"value":"koral"},{"labels":{"pl-PL":"Koralowiec","en-US":"Coral (Sponge)"},"value":"koralowiec"},{"labels":{"pl-PL":"Kwarc różowy","en-US":"Rose Quartz"},"value":"kwarc-rozowy"},{"labels":{"pl-PL":"Lapis Lazuli","en-US":"Lapis Lazuli"},"value":"lapis-lazuli"},{"labels":{"pl-PL":"Malachit","en-US":"Malachite"},"value":"malachit"},{"labels":{"pl-PL":"Masa perłowa","en-US":"Mother of Pearl"},"value":"masa-perlowa"},{"labels":{"pl-PL":"Oliwin","en-US":"Peridot"},"value":"oliwin"},{"labels":{"pl-PL":"Onyks","en-US":"Onyx"},"value":"onyks"},{"labels":{"pl-PL":"Perła","en-US":"Pearl"},"value":"perla"},{"labels":{"pl-PL":"Perła naturalna hodowana","en-US":"Cultured Pearl"},"value":"perla-naturalna-hodowana"},{"labels":{"pl-PL":"Szmaragd","en-US":"Emerald"},"value":"szmaragd"},{"labels":{"pl-PL":"Turkus","en-US":"Turquoise"},"value":"turkus"},{"labels":{"pl-PL":"Turkus afrykański","en-US":"African Turquoise"},"value":"turkus-afrykanski"},{"labels":{"pl-PL":"Turmalin","en-US":"Tourmaline"},"value":"turmalin"}]'),
  1,
  1780666417000,
  1780676836105
),
(
  '019e980d-b8c4-72c3-bb24-04bd2a0a7a42',
  'zapiecie',
  json_object('pl-PL', 'Zapięcie', 'en-US', 'Closure Type'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"Klasyczny karabińczyk","en-US":"Lobster Clasp"},"value":"klasyczny-karabinczyk"},{"labels":{"pl-PL":"Typu toggle","en-US":"Toggle Clasp"},"value":"typu-toggle"},{"labels":{"pl-PL":"Bigiel","en-US":"Ear Wire / French Hook"},"value":"bigiel"},{"labels":{"pl-PL":"Bigiel angielski","en-US":"Leverback"},"value":"bigiel-angielski"},{"labels":{"pl-PL":"Wkręt","en-US":"Screw Back / Screw Clasp"},"value":"wkret"},{"labels":{"pl-PL":"Kreol","en-US":"Latch Back / Hinged Snap"},"value":"kreol"},{"labels":{"pl-PL":"Sztyft","en-US":"Push Back / Friction Back"},"value":"sztyft"}]'),
  2,
  1780667496000,
  1780676836106
),
(
  '019e9804-1ddd-771d-a1ea-c257cfb76610',
  'material',
  json_object('pl-PL', 'Materiał', 'en-US', 'Material'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"Srebro 925","en-US":"925 Sterling Silver"},"value":"srebro-925"},{"labels":{"pl-PL":"Złoto 585","en-US":"14K Gold"},"value":"zloto-585"}]'),
  3,
  1780666867000,
  1780676836106
),
(
  '019e986f-2f9a-75ab-bc28-82b89d9f4240',
  'powloka',
  json_object('pl-PL', 'Powłoka', 'en-US', 'Plating'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"14K żółte złoto (e-coating)","en-US":"14K Yellow Gold (E-Coating)"},"value":"14k-zolte-zloto-e-coating"},{"labels":{"pl-PL":"Rod","en-US":"Rhodium"},"value":"rod"}]'),
  4,
  1780673884000,
  1780676836106
),
(
  '019e989c-127f-75d8-b753-5cae337f5af6',
  'typ',
  json_object('pl-PL', 'Typ', 'en-US', 'Type'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"Pozłacane","en-US":"Gold Plated"},"value":"pozlacane"}]'),
  5,
  1780676825000,
  1780676836106
),
(
  '019e9807-ed47-737f-a06e-d51de4b6d448',
  'srednica',
  json_object('pl-PL', 'Średnica', 'en-US', 'Diameter'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"10 mm","en-US":"10 mm"},"value":"10-mm"},{"labels":{"pl-PL":"15 mm","en-US":"15 mm"},"value":"15-mm"},{"labels":{"pl-PL":"20 mm","en-US":"20 mm"},"value":"20-mm"},{"labels":{"pl-PL":"24 mm","en-US":"24 mm"},"value":"24-mm"}]'),
  6,
  1780667117000,
  1780676836046
),
(
  '019e988a-699b-745d-97e1-473ab437e9fd',
  'waga-uzytego-surowca',
  json_object('pl-PL', 'Waga użytego surowca', 'en-US', 'Material weight'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"3 g","en-US":"3 g"},"value":"3-g"},{"labels":{"pl-PL":"> 5 g","en-US":"> 5 g"},"value":"5-g"},{"labels":{"pl-PL":"100 g","en-US":"100 g"},"value":"100-g"},{"labels":{"pl-PL":"200 g","en-US":"200 g"},"value":"200-g"}]'),
  7,
  1780675668000,
  1780676836106
),
(
  '019e9872-e2c3-73c1-8b12-dd53ae8cca43',
  'wielkosc-kamieni',
  json_object('pl-PL', 'Wielkość kamieni', 'en-US', 'Stone size'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"~ 3 mm","en-US":"~ 3 mm"},"value":"3-mm"},{"labels":{"pl-PL":"~ 3 - 4 mm","en-US":"~ 3 - 4 mm"},"value":"3-4-mm"},{"labels":{"pl-PL":"~ 5 mm","en-US":"~ 5 mm"},"value":"5-mm"},{"labels":{"pl-PL":"~ 6 - 7 mm","en-US":"~ 6 - 7 mm"},"value":"6-7-mm"},{"labels":{"pl-PL":"~ 10 mm","en-US":"~ 10 mm"},"value":"10-mm"}]'),
  8,
  1780674126000,
  1780676836106
),
(
  '019e9877-a188-7250-b2c8-f8a023d2bae4',
  'kolor-kamieni',
  json_object('pl-PL', 'Kolor kamieni', 'en-US', 'Stone colour'),
  'multiselect',
  NULL,
  json('[{"labels":{"pl-PL":"Kremowy","en-US":"Cream"},"value":"kremowy"},{"labels":{"pl-PL":"Biały","en-US":"White"},"value":"bialy"},{"labels":{"pl-PL":"Zielony","en-US":"Green"},"value":"zielony"},{"labels":{"pl-PL":"Beżowy","en-US":"Beige"},"value":"bezowy"},{"labels":{"pl-PL":"Czarny","en-US":"Black"},"value":"czarny"},{"labels":{"pl-PL":"Wielokolorowy","en-US":"Multicolour"},"value":"wielokolorowy"}]'),
  9,
  1780674437000,
  1780676836107
),
(
  '019e9892-380f-738c-aa5d-07c4fd10c92a',
  'wymiary-elementu',
  json_object('pl-PL', 'Wymiary elementu', 'en-US', 'Element Dimensions'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"20 x 12 mm","en-US":"20 x 12 mm"},"value":"20-x-12-mm"},{"labels":{"pl-PL":"17 mm","en-US":"17 mm"},"value":"17-mm"},{"labels":{"pl-PL":"13 x 5 mm","en-US":"13 x 5 mm"},"value":"13-x-5-mm"},{"labels":{"pl-PL":"31 x 15 mm","en-US":"31 x 15 mm"},"value":"31-x-15-mm"},{"labels":{"pl-PL":"15 x 13 mm","en-US":"15 x 13 mm"},"value":"15-x-13-mm"},{"labels":{"pl-PL":"22 x 16 mm","en-US":"22 x 16 mm"},"value":"22-x-16-mm"},{"labels":{"pl-PL":"17 x 5 mm","en-US":"17 x 5 mm"},"value":"17-x-5-mm"},{"labels":{"pl-PL":"15,5 x 7 mm","en-US":"15,5 x 7 mm"},"value":"15-5-x-7-mm"},{"labels":{"pl-PL":"20 x 22 mm","en-US":"20 x 22 mm"},"value":"20-x-22-mm"},{"labels":{"pl-PL":"20 x 15 mm","en-US":"20 x 15 mm"},"value":"20-x-15-mm"},{"labels":{"pl-PL":"21 x 17 mm","en-US":"21 x 17 mm"},"value":"21-x-17-mm"}]'),
  10,
  1780676180000,
  1780676836107
),
(
  '019e986c-a8cb-7018-9fae-c6c3b9d3d317',
  'wielkosc-zawieszki',
  json_object('pl-PL', 'Wielkość zawieszki', 'en-US', 'Pendant Size'),
  'select',
  NULL,
  json('[{"labels":{"pl-PL":"24 mm","en-US":"24 mm"},"value":"24-mm"},{"labels":{"pl-PL":"30 mm","en-US":"30 mm"},"value":"30-mm"},{"labels":{"pl-PL":"2 cm","en-US":"2 cm"},"value":"2-cm"},{"labels":{"pl-PL":"3 cm","en-US":"3 cm"},"value":"3-cm"},{"labels":{"pl-PL":"14 x 17 mm","en-US":"14 x 17 mm"},"value":"14-x-17-mm"},{"labels":{"pl-PL":"19 x 20 mm","en-US":"19 x 20 mm"},"value":"19-x-20-mm"},{"labels":{"pl-PL":"35 x 21 mm","en-US":"35 x 21 mm"},"value":"35-x-21-mm"}]'),
  11,
  1780673718000,
  1780676836107
),
(
  '019e97f0-3172-70c7-b740-80f78750782f',
  'dlugosc-przedluzki',
  json_object('pl-PL', 'Długość przedłużki', 'en-US', 'Extension length'),
  'number',
  'cm',
  json('[{"labels":{"pl-PL":"3 cm","en-US":"3 cm"},"value":"3-cm"}]'),
  12,
  1780665561000,
  1780676836107
),
(
  '019e9879-96d8-7428-a8c1-08e824955ff3',
  'dlugosc-bransoletki',
  json_object('pl-PL', 'Długość bransoletki', 'en-US', 'Bracelet Length'),
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
  json_object('pl-PL', 'Długość naszyjnika', 'en-US', 'Necklace Length'),
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
