UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(replace(replace(json_extract(`bodies`, '$."pl-PL"'), 'lub wygaśnie,
- wynik weryfikacji Cloudflare Turnstile, która odróżnia ludzi od botów przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia; aby sprawdzić ten wynik, przekazujemy Cloudflare jednorazowy token weryfikacji wraz z adresem IP.', 'lub wygaśnie.'), 'pamięć podręczna, ochrona przed atakami i weryfikacja Cloudflare Turnstile.', 'pamięć podręczna i ochrona przed atakami.'), '### Cloudflare Turnstile

Przy rejestracji, przypomnieniu hasła, ponownym wysłaniu linku weryfikacyjnego, zapisie do newslettera, przejściu do płatności i odstąpieniu od umowy z użyciem numeru zamówienia ładuje się weryfikacja Cloudflare Turnstile w ramce z domeny challenges.cloudflare.com. Sprawdza ona sygnały z przeglądarki i urządzenia, aby odróżnić ludzi od botów, i przekazuje formularzowi jednorazowy token ważny 5 minut. Dane przetwarzane przez Turnstile opisuje [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

', '')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791806400000),
  `updated_at` = 1791806400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Cloudflare Turnstile') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(replace(replace(json_extract(`bodies`, '$."en-US"'), 'fails or expires,
- the result of the Cloudflare Turnstile check, which tells people from bots when you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number; to check that result, we send Cloudflare the check''s one-time token together with your IP address.', 'fails or expires.'), 'caching, protection against attacks and the Cloudflare Turnstile check.', 'caching and protection against attacks.'), '### Cloudflare Turnstile

When you sign up, ask for a password reset, ask for a new verification link, subscribe to the newsletter, go to payment and withdraw from the contract by order number, the Cloudflare Turnstile check loads in a frame from challenges.cloudflare.com. It checks signals from your browser and device to tell people from bots and gives the form a one-time token valid for 5 minutes. The data Turnstile processes is described in the [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/).

', '')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1791806400000),
  `updated_at` = 1791806400000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'Cloudflare Turnstile') > 0;
