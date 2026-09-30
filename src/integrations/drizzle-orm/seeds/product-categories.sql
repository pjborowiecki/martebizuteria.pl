DELETE FROM product_category
WHERE handle IN ('naszyjniki', 'kolczyki', 'chokery', 'bransoletki', 'bransoletki-urodzeniowe', 'pierscionki', 'bizuteria-z-odciskami')
  AND id NOT IN (
    '019e91fb-0641-71e1-90a9-fb70c79176af',
    '019e91fc-2128-724d-9440-a8fd319474c5',
    '019e926a-b5dc-772e-9fc3-045a265a9fbc',
    '019e926c-c5b2-7209-87d7-34f4e22656d2',
    '019e926e-a7cd-73ff-bb5f-4e9eeb8f20b4',
    '01a0db02-f800-7549-b819-51380fdd32a1',
    '01a0db02-fbe8-7f8d-a3d1-81f145f7fcb7'
  );

INSERT INTO product_category (id, handle, titles, subtitles, short_descriptions, descriptions, status, rank, image, metadata, parent_id, created_at, updated_at) VALUES
(
  '019e91fb-0641-71e1-90a9-fb70c79176af',
  'naszyjniki',
  json_object('pl-PL', 'Naszyjniki', 'en-US', 'Necklaces'),
  json_object('pl-PL', 'Wyrafinowana prostota', 'en-US', 'Refined simplicity'),
  json_object(
    'pl-PL',
    'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
    'en-US',
    'Collarbone-skimming forms and clean proportions. Made to be an intimate accent worn close to the heart.'
  ),
  json_object(
    'pl-PL',
    'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
    'en-US',
    'Collarbone-skimming forms and clean proportions. Made to be an intimate accent worn close to the heart.'
  ),
  'active',
  0,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/b6ddced71c0fb8314a85db658607395770aa4919360fb6ab050c741a17e5d302.webp',
  NULL,
  NULL,
  1780565608000,
  1780567210093
),
(
  '019e91fc-2128-724d-9440-a8fd319474c5',
  'kolczyki',
  json_object('pl-PL', 'Kolczyki', 'en-US', 'Earrings'),
  json_object('pl-PL', 'Precyzyjne akcenty', 'en-US', 'Precise accents'),
  json_object(
    'pl-PL',
    'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
    'en-US',
    'From minimalist studs to bolder shapes. Designed to frame the face and anchor your look.'
  ),
  json_object(
    'pl-PL',
    'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
    'en-US',
    'From minimalist studs to bolder shapes. Designed to frame the face and anchor your look.'
  ),
  'active',
  1,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/0744de07aa8c0687c6fa8ac719e98031d898690a35a9557562d5cfae33c386ef.webp',
  NULL,
  NULL,
  1780565680000,
  1780572982774
),
(
  '019e926a-b5dc-772e-9fc3-045a265a9fbc',
  'chokery',
  json_object('pl-PL', 'Chokery', 'en-US', 'Chokers'),
  json_object('pl-PL', 'Mocne linie', 'en-US', 'Strong lines'),
  json_object(
    'pl-PL',
    'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
    'en-US',
    'Solid weaves and minerals worn close to the body. A structural detail that catches the light and defines the whole look.'
  ),
  json_object(
    'pl-PL',
    'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
    'en-US',
    'Solid weaves and minerals worn close to the body. A structural detail that catches the light and defines the whole look.'
  ),
  'active',
  2,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/5c6797eff082cf9e651a9ca81b93b7c1f128612f00aff0053f56325cb054aa7f.webp',
  NULL,
  NULL,
  1780572927000,
  1780572989039
),
(
  '019e926c-c5b2-7209-87d7-34f4e22656d2',
  'bransoletki',
  json_object('pl-PL', 'Bransoletki', 'en-US', 'Bracelets'),
  json_object('pl-PL', 'Płynne struktury', 'en-US', 'Fluid structures'),
  json_object(
    'pl-PL',
    'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
    'en-US',
    'Polished metal that settles softly on the wrist. Made to wear solo or build bold layered compositions.'
  ),
  json_object(
    'pl-PL',
    'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
    'en-US',
    'Polished metal that settles softly on the wrist. Made to wear solo or build bold layered compositions.'
  ),
  'active',
  3,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/df5bf498d343472e44bf66a31aa89d2a0c3d3817c4a4514bb52178bc87de3358.webp',
  NULL,
  NULL,
  1780573062000,
  1780573062000
),
(
  '019e926e-a7cd-73ff-bb5f-4e9eeb8f20b4',
  'bransoletki-urodzeniowe',
  json_object('pl-PL', 'Bransoletki urodzeniowe', 'en-US', 'Birthstone bracelets'),
  json_object('pl-PL', 'Osobisty talizman', 'en-US', 'A personal talisman'),
  json_object(
    'pl-PL',
    'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
    'en-US',
    'Natural stones tied to birth months. A considered accent in our raw aesthetic, made to stay with you for years.'
  ),
  json_object(
    'pl-PL',
    'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
    'en-US',
    'Natural stones tied to birth months. A considered accent in our raw aesthetic, made to stay with you for years.'
  ),
  'active',
  4,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/7fc335e66f741dec08edc94a52044688b3648752787f384b55fe19fd030e1653.webp',
  NULL,
  NULL,
  1780573186000,
  1780573186000
),
(
  '01a0db02-f800-7549-b819-51380fdd32a1',
  'pierscionki',
  json_object('pl-PL', 'Pierścionki', 'en-US', 'Rings'),
  json_object('pl-PL', 'Wyraziste formy', 'en-US', 'Expressive forms'),
  json_object(
    'pl-PL',
    'Rzeźbiarskie sygnety i delikatne obrączki noszone solo lub w warstwach. Formy, które budują charakter dłoni i zostają z Tobą na co dzień.',
    'en-US',
    'Sculptural signets and slender bands worn solo or stacked. Forms that give the hand its character and stay with you every day.'
  ),
  json_object(
    'pl-PL',
    'Rzeźbiarskie sygnety i delikatne obrączki noszone solo lub w warstwach. Formy, które budują charakter dłoni i zostają z Tobą na co dzień.',
    'en-US',
    'Sculptural signets and slender bands worn solo or stacked. Forms that give the hand its character and stay with you every day.'
  ),
  'active',
  5,
  NULL,
  NULL,
  NULL,
  1790380800000,
  1790380800000
),
(
  '01a0db02-fbe8-7f8d-a3d1-81f145f7fcb7',
  'bizuteria-z-odciskami',
  json_object('pl-PL', 'Biżuteria z odciskami', 'en-US', 'Fingerprint jewellery'),
  json_object('pl-PL', 'Osobisty ślad', 'en-US', 'A personal trace'),
  json_object(
    'pl-PL',
    'Ta kategoria jest jeszcze pusta — ale nie na długo. Już wkrótce pojawią się tutaj indywidualne projekty biżuterii z odciskami palców oraz odciskami noska psa, wykonane w srebrze próby 925 i złocie 585. Każdy projekt będzie tworzony na zamówienie i przygotowany na podstawie przesłanego odcisku, dzięki czemu powstanie biżuteria o osobistym znaczeniu.',
    'en-US',
    'This category is still empty — but not for long. Individual fingerprint jewellery designs, and pieces made from a dog''s nose print, will appear here soon, crafted in 925 sterling silver and 585 gold. Every piece is made to order from the print you send us, so the jewellery carries a meaning that is entirely personal.'
  ),
  json_object(
    'pl-PL',
    'Ta kategoria jest jeszcze pusta — ale nie na długo. Już wkrótce pojawią się tutaj indywidualne projekty biżuterii z odciskami palców oraz odciskami noska psa, wykonane w srebrze próby 925 i złocie 585. Każdy projekt będzie tworzony na zamówienie i przygotowany na podstawie przesłanego odcisku, dzięki czemu powstanie biżuteria o osobistym znaczeniu.',
    'en-US',
    'This category is still empty — but not for long. Individual fingerprint jewellery designs, and pieces made from a dog''s nose print, will appear here soon, crafted in 925 sterling silver and 585 gold. Every piece is made to order from the print you send us, so the jewellery carries a meaning that is entirely personal.'
  ),
  'active',
  6,
  NULL,
  NULL,
  NULL,
  1790380800000,
  1790380800000
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  titles = excluded.titles,
  subtitles = excluded.subtitles,
  short_descriptions = excluded.short_descriptions,
  descriptions = excluded.descriptions,
  status = excluded.status,
  rank = excluded.rank,
  image = excluded.image,
  metadata = excluded.metadata,
  parent_id = excluded.parent_id,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
