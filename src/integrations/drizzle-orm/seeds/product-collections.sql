DELETE FROM product_collection
WHERE handle IN ('nowosci', 'serbro-925', 'zloto-585')
  AND id NOT IN (
    '019e97ab-79e8-7449-b193-28b63bd5be04',
    '019e97ab-79ea-77ac-8f36-b86ef9405511',
    '019e97ab-79ea-77ac-8f36-bc18310c8ed0'
  );

INSERT INTO product_collection (id, handle, titles, descriptions, status, rank, image, metadata, created_at, updated_at) VALUES
(
  '019e97ab-79e8-7449-b193-28b63bd5be04',
  'nowosci',
  json_object('pl', 'Nowości', 'en', 'New arrivals'),
  json_object(
    'pl',
    'Pierwsze spojrzenie na to, co właśnie opuściło nasze warszawskie atelier. Każda forma rodzi się z umiaru — surowy minerał oprawiony w srebro próby 925, wykończony ręcznie tak, by przetrwać znacznie dłużej niż sezon. To nie premiera dla samej nowości, lecz starannie wyważony wybór projektów, które dopiero zaczynają swoją historię. Odkryj je, zanim staną się Twoją codziennością.',
    'en',
    'A first look at what has just left our Warsaw atelier. Each form is born from restraint — raw mineral set in 925 silver, finished by hand to outlast the season. Not a launch for novelty''s sake, but a carefully balanced selection of pieces just beginning their story. Discover them before they become part of your everyday.'
  ),
  'active',
  0,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/efe53b1e9eddb9c2f16902d97df4d9b78279fae93cdf768a36be90bfbc7e8e30.jpg',
  NULL,
  1780337468000,
  1780489107943
),
(
  '019e97ab-79ea-77ac-8f36-b86ef9405511',
  'serbro-925',
  json_object('pl', 'Serbro 925', 'en', 'Sterling silver 925'),
  json_object(
    'pl',
    'Nasza flagowa kolekcja i punkt, w którym zaczyna się M''ARTE. Srebro próby 925 to nasze płótno — kruszec, który pięknie współpracuje ze światłem i z czasem staje się coraz bardziej Twój. Każdą formę ręcznie dopracowują rzemieślnicy z wieloletnim doświadczeniem, łącząc klasyczną technikę jubilerską z nowoczesną, surową prostotą. To biżuteria projektowana, by trwać — nie na jeden sezon, lecz na lata codziennego noszenia.',
    'en',
    'Our flagship collection and where M''ARTE begins. 925 silver is our canvas — a metal that works beautifully with light and becomes more yours over time. Each form is refined by hand by experienced craftspeople, blending classic jewellery technique with modern, raw simplicity. Pieces designed to last — not for one season, but for years of everyday wear.'
  ),
  'active',
  1,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/5360d92c54b4db681eaf198212610a0736192220dfcc372301a89af77db46063.webp',
  NULL,
  1780354393000,
  1780489107943
),
(
  '019e97ab-79ea-77ac-8f36-bc18310c8ed0',
  'zloto-585',
  json_object('pl', 'Złoto 585', 'en', 'Gold 585'),
  json_object(
    'pl',
    'Gdy szukasz ciepła, którego nie da srebro — i formy, która zostaje z Tobą na lata. Biżuteria z kruszcu próby 585, starannie opracowana w naszym atelier: ta sama ręczna precyzja, ta sama surowa estetyka, w szlachetnym, ciepłym blasku złota. Każdy detal jest dopracowany tak, by stać się częścią Twojego wizerunku — nie chwilowym dodatkiem, lecz trwałą inwestycją w elegancję, która nie potrzebuje głośnych słów.',
    'en',
    'When you want warmth silver cannot give — and a form that stays with you for years. 585 gold jewellery, carefully developed in our atelier: the same hand-finished precision, the same raw aesthetic, in gold''s warm glow. Every detail is refined to become part of your look — not a fleeting accessory, but a lasting investment in quiet elegance.'
  ),
  'draft',
  2,
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/collections/e9620ce774b98a40f3847521eff6214394b9ae88f96f62bcbf5b4f3ae98b540c.webp',
  NULL,
  1780494472000,
  1780494472000
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  titles = excluded.titles,
  descriptions = excluded.descriptions,
  status = excluded.status,
  rank = excluded.rank,
  image = excluded.image,
  metadata = excluded.metadata,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
