-- Snapshot of production categories (export from D1). Re-run with: bun run db:seed
INSERT INTO category (id, handle, title, subtitle, short_description, description, status, rank, image, created_at, updated_at) VALUES
(
  '019e91fb-0641-71e1-90a9-fb70c79176af',
  'naszyjniki',
  'Naszyjniki',
  'Wyrafinowana prostota',
  'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
  'Kruszące linię obojczyka formy i czyste proporcje. Stworzone, by stanowić intymny akcent noszony blisko serca.',
  'active',
  0,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/b6ddced71c0fb8314a85db658607395770aa4919360fb6ab050c741a17e5d302.webp',
  1780565608000,
  1780567210093
),
(
  '019e91fc-2128-724d-9440-a8fd319474c5',
  'kolczyki',
  'Kolczyki',
  'Precyzyjne akcenty',
  'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
  'Od minimalistycznych sztyftów po mocniejsze formy. Zaprojektowane, by ramować twarz i stanowić wyrazisty punkt Twojego wizerunku.',
  'active',
  1,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/0744de07aa8c0687c6fa8ac719e98031d898690a35a9557562d5cfae33c386ef.webp',
  1780565680000,
  1780572982774
),
(
  '019e926a-b5dc-772e-9fc3-045a265a9fbc',
  'chokery',
  'Chokery',
  'Mocne linie',
  'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
  'Solidne sploty i minerały ułożone blisko ciała. Strukturalny detal, który łapie światło i bez wysiłku definiuje całą stylizację.',
  'active',
  2,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/5c6797eff082cf9e651a9ca81b93b7c1f128612f00aff0053f56325cb054aa7f.webp',
  1780572927000,
  1780572989039
),
(
  '019e926c-c5b2-7209-87d7-34f4e22656d2',
  'bransoletki',
  'Bransoletki',
  'Płynne struktury',
  'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
  'Szlifowany metal, który miękko układa się na nadgarstku. Stworzone do noszenia solo lub budowania mocnych, warstwowych kompozycji.',
  'active',
  3,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/df5bf498d343472e44bf66a31aa89d2a0c3d3817c4a4514bb52178bc87de3358.webp',
  1780573062000,
  1780573062000
),
(
  '019e926e-a7cd-73ff-bb5f-4e9eeb8f20b4',
  'bransoletki-urodzinowe',
  'Bransoletki urodzinowe',
  'Osobisty talizman',
  'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
  'Naturalne kamienie przypisane miesiącom narodzin. Przemyślany akcent ujęty w naszą surową estetykę, który zostaje z Tobą na lata.',
  'active',
  4,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/categories/7fc335e66f741dec08edc94a52044688b3648752787f384b55fe19fd030e1653.webp',
  1780573186000,
  1780573186000
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  title = excluded.title,
  subtitle = excluded.subtitle,
  short_description = excluded.short_description,
  description = excluded.description,
  status = excluded.status,
  rank = excluded.rank,
  image = excluded.image,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
