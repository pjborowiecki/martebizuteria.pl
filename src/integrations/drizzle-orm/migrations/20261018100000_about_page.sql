INSERT INTO `content_page` (`bodies`, `descriptions`, `handle`, `id`, `revised_ats`, `titles`, `created_at`, `updated_at`) VALUES (
  json_object('pl-PL', 'Tworzymy srebrne i złote formy, łącząc klasyczne podejście do biżuterii z prostym, surowym designem. Sięgamy po naturalne minerały i kamienie, ale nie szukamy oczywistych połączeń.

Dla nas biżuteria to coś więcej niż dodatek. To sposób na pokazanie swojego charakteru, nastroju i własnego stylu. Dlatego w M''ARTE nie znajdziesz klasycznych, popularnych modeli, które można zobaczyć wszędzie. Tworzymy rzeczy dla osób, które chcą wybierać po swojemu.

Lubimy proste formy, niedoskonałości naturalnych materiałów i projekty, które z czasem stają się jeszcze bardziej osobiste.

Wierzymy też, że najlepsze projekty powstają wtedy, gdy można je dopasować do człowieka. Dlatego tworzymy również indywidualną biżuterię na zamówienie — od personalizowanych odcisków po własne pomysły i nietypowe formy.', 'en-US', 'We make forms in silver and gold, joining a classical approach to jewellery with plain, raw design. We reach for natural minerals and stones, but we never look for the obvious combination.

For us jewellery is more than an accessory. It is a way to show your character, your mood and your own style. That is why at M''ARTE you will not find the classic, popular models you can see everywhere. We make things for people who want to choose on their own terms.

We like simple forms, the imperfections of natural materials, and designs that grow more personal with time.

We also believe the best pieces come about when they can be fitted to a person. That is why we make bespoke jewellery to order as well — from personalised prints to your own ideas and unusual forms.'),
  json_object('pl-PL', 'M''ARTE to biżuteria tworzona w Bochni w pracowni jubilerskiej, która działa na rynku od 1978 roku.', 'en-US', 'M''ARTE is jewellery made in Bochnia, in a goldsmith''s workshop that has been working since 1978.'),
  'about',
  '01a14e74-3100-7c3e-9b41-6d2a8f5e1c07',
  json_object('pl-PL', 1792317600000, 'en-US', 1792317600000),
  json_object('pl-PL', 'O M''Arte', 'en-US', 'About M''Arte'),
  1792317600000,
  1792317600000
)
ON CONFLICT(`handle`) DO NOTHING;
