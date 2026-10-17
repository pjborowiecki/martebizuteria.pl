UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń i ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień.', 'W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń, wybraną strefę czasową i format dat i liczb oraz ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'W koncie przechowujemy też dane, które do niego dodajesz: numer telefonu, zapisane adresy, listę życzeń i ustawienia uwierzytelniania dwuskładnikowego, a także historię Twoich zamówień.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), '- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.', '- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.
- `marte_time_zone` – zapamiętuje strefę czasową Twojego urządzenia, aby pokazywać w niej daty i godziny; 1 rok.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), '- `marte_locale` – zapamiętuje wybraną wersję językową sklepu; 1 rok.') > 0
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'marte_time_zone') = 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), '- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.', '- `tsr-scroll-restoration-v1_3` (sessionStorage) – pozycja przewinięcia odwiedzonych stron, aby strona, do której wracasz, otworzyła się w tym samym miejscu; do zamknięcia karty.
- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.
- `better-auth.message` (localStorage) – sygnał zapisywany po wylogowaniu albo zmianie danych konta, aby pozostałe otwarte karty sklepu też się zaktualizowały.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), '- `customer-activity:page-view:…` i `customer-activity:cart-abandoned-sent` (sessionStorage) – tylko po zalogowaniu: oznaczają strony i zdarzenia koszyka już zapisane w dzienniku aktywności, aby nie zapisywać ich ponownie; do zamknięcia karty.') > 0
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'tsr-scroll-restoration') = 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), 'Your account also holds the data you add to it: your telephone number, saved addresses, wishlist and two-factor authentication settings, as well as your order history.', 'Your account also holds the data you add to it: your telephone number, saved addresses, wishlist, the time zone and the date and number format you choose, and two-factor authentication settings, as well as your order history.')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'Your account also holds the data you add to it: your telephone number, saved addresses, wishlist and two-factor authentication settings, as well as your order history.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), '- `marte_locale` – remembers the language version of the shop you chose; 1 year.', '- `marte_locale` – remembers the language version of the shop you chose; 1 year.
- `marte_time_zone` – remembers your device''s time zone, so that dates and times are shown in it; 1 year.')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), '- `marte_locale` – remembers the language version of the shop you chose; 1 year.') > 0
  AND instr(json_extract(`bodies`, '$."en-US"'), 'marte_time_zone') = 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), '- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.', '- `tsr-scroll-restoration-v1_3` (sessionStorage) – how far you scrolled down the pages you visited, so that a page you go back to opens at the same place; until you close the tab.
- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.
- `better-auth.message` (localStorage) – a signal left when you sign out or change your account details, so that the shop''s other open tabs update too.')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), '- `customer-activity:page-view:…` and `customer-activity:cart-abandoned-sent` (sessionStorage) – only while you are signed in: mark the pages and cart events already recorded in the activity log so that they are not recorded twice; until you close the tab.') > 0
  AND instr(json_extract(`bodies`, '$."en-US"'), 'tsr-scroll-restoration') = 0;
