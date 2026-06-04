DELETE FROM product_category
WHERE handle IN ('naszyjniki', 'kolczyki', 'chokery', 'bransoletki', 'bransoletki-urodzeniowe')
  AND id NOT IN (
    '019e91fb-0641-71e1-90a9-fb70c79176af',
    '019e91fc-2128-724d-9440-a8fd319474c5',
    '019e926a-b5dc-772e-9fc3-045a265a9fbc',
    '019e926c-c5b2-7209-87d7-34f4e22656d2',
    '019e926e-a7cd-73ff-bb5f-4e9eeb8f20b4'
  );

INSERT INTO product_category (id, handle, titles, subtitles, short_descriptions, descriptions, status, rank, image, metadata, parent_id, created_at, updated_at) VALUES
(
  '019e91fb-0641-71e1-90a9-fb70c79176af',
  'naszyjniki',
  json_object('pl', 'Naszyjniki', 'en', 'Necklaces'),
  json_object('pl', 'Wyrafinowana prostota', 'en', 'Refined simplicity'),
  json_object(
    'pl',
    'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
    'en',
    'Collarbone-skimming forms and clean proportions. Made to be an intimate accent worn close to the heart.'
  ),
  json_object(
    'pl',
    'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
    'en',
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
  json_object('pl', 'Kolczyki', 'en', 'Earrings'),
  json_object('pl', 'Precyzyjne akcenty', 'en', 'Precise accents'),
  json_object(
    'pl',
    'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
    'en',
    'From minimalist studs to bolder shapes. Designed to frame the face and anchor your look.'
  ),
  json_object(
    'pl',
    'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
    'en',
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
  json_object('pl', 'Chokery', 'en', 'Chokers'),
  json_object('pl', 'Mocne linie', 'en', 'Strong lines'),
  json_object(
    'pl',
    'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
    'en',
    'Solid weaves and minerals worn close to the body. A structural detail that catches the light and defines the whole look.'
  ),
  json_object(
    'pl',
    'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
    'en',
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
  json_object('pl', 'Bransoletki', 'en', 'Bracelets'),
  json_object('pl', 'Płynne struktury', 'en', 'Fluid structures'),
  json_object(
    'pl',
    'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
    'en',
    'Polished metal that settles softly on the wrist. Made to wear solo or build bold layered compositions.'
  ),
  json_object(
    'pl',
    'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
    'en',
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
  json_object('pl', 'Bransoletki urodzeniowe', 'en', 'Birthstone bracelets'),
  json_object('pl', 'Osobisty talizman', 'en', 'A personal talisman'),
  json_object(
    'pl',
    'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
    'en',
    'Natural stones tied to birth months. A considered accent in our raw aesthetic, made to stay with you for years.'
  ),
  json_object(
    'pl',
    'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
    'en',
    'Natural stones tied to birth months. A considered accent in our raw aesthetic, made to stay with you for years.'
  ),
  'active',
  4,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/7fc335e66f741dec08edc94a52044688b3648752787f384b55fe19fd030e1653.webp',
  NULL,
  NULL,
  1780573186000,
  1780573186000
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
