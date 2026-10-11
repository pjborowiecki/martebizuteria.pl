UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), '1. Wyślij nam oświadczenie o odstąpieniu od umowy e-mailem na adres', '1. Odstąp od umowy [przez formularz na naszej stronie](/withdraw-from-contract), podając numer zamówienia i adres e-mail użyty przy zamówieniu, albo przyciskiem „Odstąp od umowy” przy zamówieniu w panelu klienta. Możesz też wysłać nam oświadczenie o odstąpieniu od umowy e-mailem na adres')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'exchanges-and-returns'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), '1. Wyślij nam oświadczenie o odstąpieniu od umowy e-mailem na adres') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(replace(json_extract(`bodies`, '$."en-US"'), '**The withdrawal and complaint forms linked below are in Polish.**', '**The PDF withdrawal and complaint forms linked below are in Polish.**'), '1. Send us a statement that you are withdrawing from the contract, by e-mail to', '1. Withdraw [with the form on our website](/withdraw-from-contract), giving your order number and the e-mail address you ordered with, or with the "Withdraw from the contract" button on the order in your account. You can also send us a statement that you are withdrawing from the contract, by e-mail to')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'exchanges-and-returns'
  AND instr(json_extract(`bodies`, '$."en-US"'), '1. Send us a statement that you are withdrawing from the contract, by e-mail to') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Konsument odstępuje od umowy, składając Sprzedawcy oświadczenie, w szczególności e-mailem na adres', 'Konsument odstępuje od umowy, składając Sprzedawcy oświadczenie, w szczególności za pomocą funkcji [„Odstąp od umowy”](/withdraw-from-contract) w Sklepie, dostępnej także przy Zamówieniu na Koncie, e-mailem na adres')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Konsument odstępuje od umowy, składając Sprzedawcy oświadczenie, w szczególności e-mailem na adres') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), 'The Consumer withdraws from the contract by making a statement to the Seller, in particular by e-mail to', 'The Consumer withdraws from the contract by making a statement to the Seller, in particular with the ["Withdraw from the contract"](/withdraw-from-contract) function in the Shop, which is also available on the Order in the Account, by e-mail to')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'terms-of-service'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'The Consumer withdraws from the contract by making a statement to the Seller, in particular by e-mail to') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(replace(json_extract(`bodies`, '$."pl-PL"'), 'zapisie do newslettera i przejściu do płatności', 'zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia'), 'linkiem do resetu hasła albo potwierdzeniem zapisu do newslettera wysyłanych na jeden adres', 'linkiem do resetu hasła, potwierdzeniem zapisu do newslettera albo potwierdzeniem odstąpienia od umowy złożonego z użyciem numeru zamówienia wysyłanych na jeden adres')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'zapisie do newslettera i przejściu do płatności') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(replace(json_extract(`bodies`, '$."en-US"'), 'subscribe to the newsletter and go to payment', 'subscribe to the newsletter, go to payment and withdraw from the contract by order number'), 'a password reset link or a newsletter confirmation sent to one address', 'a password reset link, a newsletter confirmation or the acknowledgement of a withdrawal made by order number sent to one address')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'subscribe to the newsletter and go to payment') > 0;
