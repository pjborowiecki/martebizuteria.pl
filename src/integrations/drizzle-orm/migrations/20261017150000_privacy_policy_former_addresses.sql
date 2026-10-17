UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Po potwierdzeniu adresu e-mail łączymy z kontem zamówienia złożone wcześniej bez logowania na ten sam adres oraz subskrypcję newslettera na ten adres.', 'Po potwierdzeniu adresu e-mail łączymy z kontem zamówienia złożone wcześniej bez logowania na ten sam adres oraz subskrypcję newslettera na ten adres.

Adres e-mail konta możesz zmienić w jego ustawieniach. Zmiana następuje dopiero po potwierdzeniu jej linkami wysłanymi na dotychczasowy i na nowy adres, a na dotychczasowy adres wysyłamy potem informację, że adres został zmieniony. Poprzednie adresy przechowujemy w koncie razem z datami, od kiedy i do kiedy były używane, aby zamówienia, płatności i zdarzenia z czasu, gdy używany był dany adres, pozostały przy Twoim koncie, a nie trafiły do osoby, która później zacznie używać tego adresu, oraz aby chronić konto przed przejęciem (art. 6 ust. 1 lit. b i f RODO). Wiadomości o zamówieniach złożonych z poprzedniego adresu, subskrypcję newslettera i adres w Twoim profilu klienta w Stripe przenosimy na nowy adres. Poprzednie adresy usuwamy razem z kontem.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Po potwierdzeniu adresu e-mail łączymy z kontem zamówienia złożone wcześniej bez logowania na ten sam adres oraz subskrypcję newslettera na ten adres.') > 0
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Poprzednie adresy przechowujemy w koncie') = 0;
--> statement-breakpoint
UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), 'Once you confirm your e-mail address, we link to your account the orders placed earlier without signing in under the same address and any newsletter subscription for that address.', 'Once you confirm your e-mail address, we link to your account the orders placed earlier without signing in under the same address and any newsletter subscription for that address.

You can change your account''s e-mail address in its settings. The change takes effect only once you confirm it with the links we send to the current and the new address, and afterwards we let the previous address know that it was changed. We keep the previous addresses in your account together with the dates from and until which they were used, so that orders, payments and events from the time an address was in use stay with your account instead of reaching whoever uses that address later, and to protect the account from takeover (Article 6(1)(b) and (f) GDPR). Messages about orders placed with a previous address, any newsletter subscription and the address in your Stripe customer profile move to the new address. We delete the previous addresses together with the account.')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1792238400000),
  `updated_at` = 1792238400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'Once you confirm your e-mail address, we link to your account the orders placed earlier without signing in under the same address and any newsletter subscription for that address.') > 0
  AND instr(json_extract(`bodies`, '$."en-US"'), 'We keep the previous addresses in your account') = 0;
