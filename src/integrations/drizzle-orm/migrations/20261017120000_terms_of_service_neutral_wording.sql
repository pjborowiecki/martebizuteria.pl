UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'historia jego Zamówień', 'historia Zamówień Klienta')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'historia jego Zamówień') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Klient posiadający Konto', 'Klient z Kontem')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Klient posiadający Konto') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'na adres e-mail Klienta za jego zgodą', 'za zgodą Klienta na podany adres e-mail')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'na adres e-mail Klienta za jego zgodą') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Klient powinien chronić swoje urządzenie i hasło oraz sprawdzać, czy korzysta z właściwego adresu Sklepu', 'Należy chronić swoje urządzenie i hasło oraz sprawdzać, czy adres Sklepu jest właściwy')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Klient powinien chronić swoje urządzenie i hasło oraz sprawdzać, czy korzysta z właściwego adresu Sklepu') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'z chwilą wydania mu Produktu', 'z chwilą wydania Produktu Konsumentowi')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'z chwilą wydania mu Produktu') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Termin biegnie od dnia, w którym Konsument lub wskazana przez niego osoba trzecia inna niż przewoźnik objęła Produkt w posiadanie.', 'Termin biegnie od dnia objęcia Produktu w posiadanie przez Konsumenta lub wskazaną przez Konsumenta osobę trzecią inną niż przewoźnik.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Termin biegnie od dnia, w którym Konsument lub wskazana przez niego osoba trzecia inna niż przewoźnik objęła Produkt w posiadanie.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'wszystkie otrzymane od niego płatności', 'wszystkie dokonane przez Konsumenta płatności')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'wszystkie otrzymane od niego płatności') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Jeżeli Konsument wybrał sposób dostawy inny niż', 'W razie wyboru przez Konsumenta sposobu dostawy innego niż')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Jeżeli Konsument wybrał sposób dostawy inny niż') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'jakiego użył Konsument, chyba że Konsument wyraźnie zgodził się na inny sposób zwrotu, który nie wiąże się dla niego z żadnymi kosztami.', 'jakiego użyto przy płatności za Zamówienie, chyba że Konsument wyraźnie zgodzi się na inny sposób zwrotu, który nie wiąże się dla Konsumenta z żadnymi kosztami.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'jakiego użył Konsument, chyba że Konsument wyraźnie zgodził się na inny sposób zwrotu, który nie wiąże się dla niego z żadnymi kosztami.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'od dnia, w którym odstąpił od umowy', 'od dnia odstąpienia od umowy')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'od dnia, w którym odstąpił od umowy') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'zaspokojeniu jego zindywidualizowanych potrzeb', 'zaspokojeniu zindywidualizowanych potrzeb Konsumenta')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'zaspokojeniu jego zindywidualizowanych potrzeb') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'nie pozbawia Konsumenta ochrony przyznanej mu przez przepisy, których nie można wyłączyć w drodze umowy, prawa państwa, w którym ma on zwykłe miejsce pobytu.', 'nie pozbawia Konsumenta ochrony, jaką zapewniają przepisy, których nie można wyłączyć w drodze umowy, prawa państwa zwykłego pobytu Konsumenta.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'nie pozbawia Konsumenta ochrony przyznanej mu przez przepisy, których nie można wyłączyć w drodze umowy, prawa państwa, w którym ma on zwykłe miejsce pobytu.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Klient, który nie akceptuje zmian, może', 'Jeżeli Klient nie akceptuje zmian, może')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Klient, który nie akceptuje zmian, może') > 0;
