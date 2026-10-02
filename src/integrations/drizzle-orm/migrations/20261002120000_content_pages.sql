CREATE TABLE IF NOT EXISTS `content_page` (
  `bodies` text NOT NULL,
  `descriptions` text NOT NULL,
  `handle` text(64) NOT NULL,
  `id` text(36) PRIMARY KEY NOT NULL,
  `revised_ats` text NOT NULL,
  `titles` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `content_page_handle_unique` ON `content_page` (`handle`);
--> statement-breakpoint
INSERT INTO `content_page` (`bodies`, `descriptions`, `handle`, `id`, `revised_ats`, `titles`, `created_at`, `updated_at`) VALUES (
  json_object('pl-PL', '## Administrator danych

Administratorem danych osobowych w serwisie M''Arte jest Pyciak Mariusz Firma Jubilerska, ul. Wąska 11, 32-700 Bochnia, NIP 8681772646, e-mail: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Dlaczego przetwarzamy Twoje dane?

Dane przetwarzane są zgodnie z RODO w następujących celach:

- realizacji usług sprzedaży biżuterii i zamówień indywidualnych (art. 6 ust. 1 lit. b RODO) — przetwarzanie trwa do wygaśnięcia roszczeń, liczonych od chwili usunięcia konta lub zrealizowania usługi,
- realizacji obowiązków prawnych, podatkowych i skarbowych (art. 6 ust. 1 lit. c RODO),
- ochrony i egzekucji roszczeń jako prawnie usprawiedliwiony interes (art. 6 ust. 1 lit. f RODO),
- odpowiadania na pytania kierowane e-mailem lub telefonicznie jako uzasadniony interes (art. 6 ust. 1 lit. f RODO),
- marketingu i promocji produktów jako uzasadniony interes (art. 6 ust. 1 lit. f RODO),
- funkcjonowania strony poprzez pliki cookies (art. 6 ust. 1 lit. f RODO).

Dla kontrahentów dodatkowo:

- realizacji zawartych umów i ochrony roszczeń (art. 6 ust. 1 lit. b i f RODO),
- weryfikacji tożsamości w rejestrach publicznych (art. 6 ust. 1 lit. b i f RODO).

## Komu udostępniamy dane?

- dostawcom usług IT, hostingu, marketingu i płatności oraz pracownikom,
- radcom prawnym, adwokatom, operatorom pocztowym i dostawcom usług płatniczych.

## Jakie przysługują Ci prawa?

- prawo dostępu do danych (art. 15 RODO),
- prawo do sprostowania danych (art. 16 RODO),
- prawo do żądania usunięcia danych (art. 17 RODO),
- prawo do ograniczenia przetwarzania (art. 18 RODO),
- prawo do przenoszenia danych (art. 20 RODO),
- prawo do cofnięcia zgody,
- prawo do sprzeciwu wobec przetwarzania (art. 21 RODO),
- prawo skargi do Prezesa Urzędu Ochrony Danych Osobowych.

## Jakie informacje zbieramy za pomocą plików cookies?

- adres IP urządzenia,
- typ urządzenia,
- czas przebywania na stronie,
- podjęte czynności na stronie,
- lokalizację połączenia.', 'en-US', '## Data controller

The controller of personal data in the M''Arte store is Pyciak Mariusz Firma Jubilerska, ul. Wąska 11, 32-700 Bochnia, Poland, NIP 8681772646, e-mail: [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Why do we process your data?

Data is processed in accordance with the GDPR for the following purposes:

- to provide jewellery sales services and fulfil bespoke orders (Article 6(1)(b) GDPR) — processing continues until claims expire, counted from the moment an account is deleted or a service is completed,
- to meet legal, tax and fiscal obligations (Article 6(1)(c) GDPR),
- to protect and enforce claims as a legitimate interest (Article 6(1)(f) GDPR),
- to answer questions sent by e-mail or asked by telephone as a legitimate interest (Article 6(1)(f) GDPR),
- for the marketing and promotion of products as a legitimate interest (Article 6(1)(f) GDPR),
- to operate the website through cookies (Article 6(1)(f) GDPR).

Additionally, for business partners:

- to perform concluded contracts and protect claims (Article 6(1)(b) and (f) GDPR),
- to verify identity in public registers (Article 6(1)(b) and (f) GDPR).

## Who do we share data with?

- providers of IT, hosting, marketing and payment services, and our staff,
- legal advisers, attorneys, postal operators and payment service providers.

## What rights do you have?

- the right of access to your data (Article 15 GDPR),
- the right to rectification (Article 16 GDPR),
- the right to erasure (Article 17 GDPR),
- the right to restriction of processing (Article 18 GDPR),
- the right to data portability (Article 20 GDPR),
- the right to withdraw consent,
- the right to object to processing (Article 21 GDPR),
- the right to lodge a complaint with the President of the Personal Data Protection Office.

## What information do we collect through cookies?

- the device IP address,
- the device type,
- time spent on the site,
- actions taken on the site,
- the location of the connection.'),
  json_object('pl-PL', 'Jak M''Arte zbiera, wykorzystuje i chroni Twoje dane osobowe zgodnie z RODO.', 'en-US', 'How M''Arte collects, uses and protects your personal data under the GDPR.'),
  'privacy-policy',
  '019a3f2e-7c4d-7b1a-9e2f-3d5c8a1b6e01',
  json_object('pl-PL', 1790683200000, 'en-US', 1790683200000),
  json_object('pl-PL', 'Polityka prywatności', 'en-US', 'Privacy policy'),
  1790683200000,
  1790683200000
),
(
  json_object('pl-PL', '## Prawo odstąpienia od umowy

Konsumentom przysługuje 14-dniowe prawo do odstąpienia od umowy. Prawo to przysługuje również osobom fizycznym zawierającym umowę bezpośrednio związaną z ich działalnością gospodarczą, gdy z treści tej umowy wynika, że nie posiada ona dla tych osób charakteru zawodowego w rozumieniu art. 556(4) Kodeksu cywilnego. Pozostałym przedsiębiorcom prawo do odstąpienia od umowy nie przysługuje.

Prawo do odstąpienia od umowy zawartej na odległość nie przysługuje w odniesieniu do zamówień indywidualnych, to jest umów, w których przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb.

Zwrot środków dokonywany jest w ciągu 14 dni od dostarczenia zwracanego produktu lub produktów do sklepu, w sposób wskazany przez Klienta w formularzu odstąpienia od umowy. Zwracany towar nie może nosić śladów użytkowania, a koszt wysyłki zwrotnej pokrywa kupujący.

## Zwrot towaru

Zgodnie z obowiązującym prawem masz 14 dni na zwrot towaru. Aby odstąpić od umowy i zwrócić zakupiony produkt, wypełnij potrzebne oświadczenie i wraz ze zwracanym produktem lub produktami wyślij je na adres:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia

Do paczki z oświadczeniem i zwracanym produktem lub produktami dołącz także wszystkie otrzymane z nimi akcesoria oraz paragon lub fakturę.

[Pobierz formularz zwrotu](/forms/formularz_zwrotu.pdf)

**Ważne!** Zwrotom nie podlegają: biżuteria wykonana na specjalne zamówienie, konkretny rozmiar, zawieszki z grawerem oraz biżuteria personalizowana.

Zwrot płatności nastąpi w ciągu 14 dni od otrzymania zwrotu. Koszt przesyłki przy zwrocie produktu ponosi Kupujący. Przesyłki pobraniowe nie będą przyjmowane. Kupujący odpowiada za zmniejszenie wartości rzeczy wynikające z korzystania z niej w sposób inny niż było to konieczne do stwierdzenia charakteru, cech i funkcjonowania rzeczy.

Masz wątpliwości, jak dokonać zwrotu lub czy zakupiony przez Ciebie produkt podlega zwrotom? Napisz na [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Reklamacje

### W celu zgłoszenia reklamacji

1. Napisz do nas na [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).
2. [Pobierz formularz reklamacji](/forms/formularz_reklamacji.pdf), uzupełnij go i koniecznie dołącz do zwracanych produktów.
3. Spakuj rzeczy wraz z wypełnionym formularzem reklamacji oraz paragonem i odeślij na adres:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia

### Wymagania

1. Sprzedający zobowiązuje się do rozpatrzenia reklamacji w ciągu 14 dni roboczych od momentu jej dostarczenia.
2. Reklamacja obejmuje wyłącznie wady i uszkodzenia nie wynikające z niewłaściwego użytkowania produktu.
3. Koszt wysyłki ponosi kupujący.

**Ważne!** Okres gwarancji na biżuterię M''Arte wynosi 2 lata. Gwarancja i reklamacja nie obejmują uszkodzeń mechanicznych (zerwanych lub uszkodzonych elementów) oraz naturalnych procesów wycierania się pozłocenia z elementów pozłacanych lub utleniania srebrnych komponentów. Więcej informacji o tym, jak przedłużyć trwałość srebrnej biżuterii, znajdziesz w zakładce „Jak dbać o biżuterię".

Reklamacja zostanie rozpatrzona w ciągu 14 dni od otrzymania przesyłki. Przed upływem tego czasu Klient zostanie poinformowany o decyzji dotyczącej rozpatrzenia reklamacji.

Masz wątpliwości, jak złożyć reklamację? Napisz na [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).', 'en-US', '## Right to withdraw from the contract

Consumers have a 14-day right to withdraw from the contract. This right also applies to natural persons entering into a contract directly connected with their business activity where the contract is not of a professional character for them within the meaning of Article 556(4) of the Polish Civil Code. Other traders have no right of withdrawal.

The right to withdraw from a distance contract does not apply to bespoke orders, that is contracts where the subject of performance is a non-prefabricated item made to the consumer''s specification or serving to meet their individualised needs.

Refunds are issued within 14 days of the returned product or products reaching the shop, by the method the customer indicated on the withdrawal form. Returned goods must show no signs of use, and the buyer covers the cost of return shipping.

## Returning goods

Under applicable law you have 14 days to return goods. To withdraw from the contract and return a purchased product, complete the required statement and send it together with the returned product or products to:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia\
Poland

Include in the parcel, along with the statement and the returned product or products, every accessory received with them and the receipt or invoice.

[Download the return form](/forms/formularz_zwrotu.pdf)

**Important!** The following cannot be returned: jewellery made to special order, made in a specific size, engraved pendants and personalised jewellery.

Payment will be refunded within 14 days of receiving the return. The buyer covers the cost of return shipping. Cash-on-delivery parcels will not be accepted. The buyer is liable for any reduction in the value of the goods resulting from using them in a way that went beyond what was necessary to establish their nature, characteristics and functioning.

Not sure how to make a return, or whether the product you bought can be returned? Write to [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).

## Complaints

### To file a complaint

1. Write to us at [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).
2. [Download the complaint form](/forms/formularz_reklamacji.pdf), fill it in and be sure to include it with the returned products.
3. Pack the items together with the completed complaint form and the receipt, and send them to:

Pyciak Mariusz Firma Jubilerska\
ul. Wąska 11\
32-700 Bochnia\
Poland

### Requirements

1. The seller undertakes to consider a complaint within 14 working days of its delivery.
2. A complaint covers only defects and damage that do not result from improper use of the product.
3. The buyer covers the cost of shipping.

**Important!** The warranty period for M''Arte jewellery is 2 years. Neither the warranty nor the complaints procedure covers mechanical damage (broken or damaged elements) or the natural wearing away of gold plating from gold-plated elements and the oxidation of silver components. You will find more on extending the life of silver jewellery under "How to care for jewellery".

A complaint will be considered within 14 days of the parcel arriving. Before that period elapses, the customer will be informed of the decision on the complaint.

Not sure how to file a complaint? Write to [kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl).'),
  json_object('pl-PL', '14-dniowe prawo odstąpienia od umowy, zwrot zamówienia M''Arte i zgłoszenie reklamacji.', 'en-US', 'Your 14-day right of withdrawal, how to return an M''Arte order and how to file a complaint.'),
  'exchanges-and-returns',
  '019a3f2e-7c4d-7b1a-9e2f-3d5c8a1b6e02',
  json_object('pl-PL', 1790683200000, 'en-US', 1790683200000),
  json_object('pl-PL', 'Wymiana i zwroty', 'en-US', 'Exchanges and returns'),
  1790683200000,
  1790683200000
)
ON CONFLICT(`handle`) DO NOTHING;
