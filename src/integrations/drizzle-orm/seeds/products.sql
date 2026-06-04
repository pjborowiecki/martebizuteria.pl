-- Depends on product-categories.sql (primary_category_id).

DELETE FROM product
WHERE handle IN ('lapis-lazuli-necklace', 'onyx-necklace')
  AND id NOT IN (
    '019e99d8-9f56-777d-8f3c-95c393be568b',
    '019e99f2-dfa2-7798-b04f-cebfdbbdb427'
  );

INSERT INTO product (id, handle, titles, subtitles, descriptions, tags, status, thumbnail, metadata, primary_category_id, rank, created_at, updated_at) VALUES
(
  '019e99d8-9f56-777d-8f3c-95c393be568b',
  'lapis-lazuli-necklace',
  json_object('pl', 'Naszyjnik Lapis Lazuli', 'en', 'Lapis Lazuli Necklace'),
  NULL,
  json_object(
    'pl',
    'Lapis lazuli od wieków uznawany jest za kamień mądrości, harmonii i wewnętrznej siły. Jego intensywny kolor z delikatnymi złotymi drobinkami sprawia, że naszyjnik prezentuje się niezwykle szlachetnie i pasuje zarówno do codziennych stylizacji, jak i bardziej eleganckich okazji. Cienki, subtelny łańcuszek nadaje biżuterii lekkości i sprawia, że naszyjnik pięknie układa się na dekolcie. To ponadczasowy dodatek, który może stać się wyjątkowym prezentem dla bliskiej osoby lub eleganckim elementem Twojej kolekcji biżuterii.',
    'en',
    'For centuries, lapis lazuli has been considered a stone of wisdom, harmony, and inner strength. Its intense color, featuring delicate golden flecks, gives the necklace an incredibly sophisticated look that perfectly suits both everyday styles and more elegant occasions. The thin, subtle chain lends the jewelry a sense of lightness and ensures the necklace drapes beautifully across the neckline. This is a timeless accessory that can make a unique gift for a loved one or become an elegant addition to your own jewelry collection.'
  ),
  NULL,
  'published',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/b9b19fc785f25907772aee2cf6d046f2d44b4cf7939d78828c7371c95a9089cc.webp',
  NULL,
  '019e91fb-0641-71e1-90a9-fb70c79176af',
  0,
  1780697571000,
  1780698779177
),
(
  '019e99f2-dfa2-7798-b04f-cebfdbbdb427',
  'onyx-necklace',
  json_object('pl', 'Naszyjnik Onyks', 'en', 'Onyx Necklace'),
  NULL,
  json_object(
    'pl',
    'Onyks to ponadczasowy dodatek, który zachwyca elegancją i minimalistyczną formą. Głęboka, czarna barwa kamienia pięknie kontrastuje z delikatną oprawą i cienkim łańcuszkiem, tworząc biżuterię o wyjątkowo klasycznym charakterze. Onyks od wieków uznawany jest za kamień siły i ochrony. Jego intensywny kolor symbolizuje równowagę i wewnętrzną stabilność, dlatego często wybierany jest przez osoby ceniące nie tylko piękno, ale również znaczenie naturalnych kamieni. Minimalistyczny design sprawia, że naszyjnik doskonale uzupełnia zarówno codzienne stylizacje, jak i bardziej eleganckie zestawy. To biżuteria, która podkreśla indywidualny styl i dodaje subtelnej elegancji każdej stylizacji.',
    'en',
    'Onyx is a timeless accessory that captivates with its elegance and minimalist form. The deep, black hue of the stone contrasts beautifully with the delicate setting and thin chain, creating a piece of jewelry with a uniquely classic character. For centuries, onyx has been recognized as a stone of strength and protection. Its intense color symbolizes balance and inner stability, which is why it is often chosen by those who appreciate not only the beauty but also the meaning behind natural stones. The minimalist design allows the necklace to perfectly complement both everyday styles and more elegant outfits. It is a piece of jewelry that highlights your individual style and adds subtle elegance to any look.'
  ),
  NULL,
  'published',
  'https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/products/425e292cb1e1d1297839fc232ab4e9f978d1ecfa2e68477c457d1cf1929e3a35.webp',
  NULL,
  '019e91fb-0641-71e1-90a9-fb70c79176af',
  1,
  1780699291000,
  1780699412389
)
ON CONFLICT(id) DO UPDATE SET
  handle = excluded.handle,
  titles = excluded.titles,
  subtitles = excluded.subtitles,
  descriptions = excluded.descriptions,
  tags = excluded.tags,
  status = excluded.status,
  thumbnail = excluded.thumbnail,
  metadata = excluded.metadata,
  primary_category_id = excluded.primary_category_id,
  rank = excluded.rank,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
