-- Snapshot of production collections (export from D1). Re-run with: bun run db:seed
INSERT INTO collection (id, handle, title, description, image, metadata, rank, status, created_at, updated_at) VALUES
(
  '7e8f8416-5d18-4831-9da0-a14b5c657bc3',
  'nowosci',
  'Nowości',
  'Pierwsze spojrzenie na to, co właśnie opuściło nasze warszawskie atelier. Każda forma rodzi się z umiaru — surowy minerał oprawiony w srebro próby 925, wykończony ręcznie tak, by przetrwać znacznie dłużej niż sezon. To nie premiera dla samej nowości, lecz starannie wyważony wybór projektów, które dopiero zaczynają swoją historię. Odkryj je, zanim staną się Twoją codziennością.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/efe53b1e9eddb9c2f16902d97df4d9b78279fae93cdf768a36be90bfbc7e8e30.jpg',
  NULL,
  0,
  'active',
  1780337468000,
  1780489107943
),
(
  '12a56afa-1b17-4009-b384-94f03f532d20',
  'serbro-925',
  'Serbro 925',
  'Nasza flagowa kolekcja i punkt, w którym zaczyna się M''ARTE. Srebro próby 925 to nasze płótno — kruszec, który pięknie współpracuje ze światłem i z czasem staje się coraz bardziej Twój. Każdą formę ręcznie dopracowują rzemieślnicy z wieloletnim doświadczeniem, łącząc klasyczną technikę jubilerską z nowoczesną, surową prostotą. To biżuteria projektowana, by trwać — nie na jeden sezon, lecz na lata codziennego noszenia.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/5360d92c54b4db681eaf198212610a0736192220dfcc372301a89af77db46063.webp',
  NULL,
  1,
  'active',
  1780354393000,
  1780489107943
),
(
  '4ec5265b-d4bb-41ed-a9a3-eddd528fca85',
  'zloto-585',
  'Złoto 585',
  'Gdy szukasz ciepła, którego nie da srebro — i formy, która zostaje z Tobą na lata. Biżuteria z kruszcu próby 585, starannie opracowana w naszym atelier: ta sama ręczna precyzja, ta sama surowa estetyka, w szlachetnym, ciepłym blasku złota. Każdy detal jest dopracowany tak, by stać się częścią Twojego wizerunku — nie chwilowym dodatkiem, lecz trwałą inwestycją w elegancję, która nie potrzebuje głośnych słów.',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/e9620ce774b98a40f3847521eff6214394b9ae88f96f62bcbf5b4f3ae98b540c.webp',
  NULL,
  2,
  'draft',
  1780494472000,
  1780494472000
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  title = excluded.title,
  description = excluded.description,
  image = excluded.image,
  metadata = excluded.metadata,
  rank = excluded.rank,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
