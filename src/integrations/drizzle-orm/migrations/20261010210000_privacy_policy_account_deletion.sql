UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."pl-PL"', replace(json_extract(`bodies`, '$."pl-PL"'), 'Subskrypcja nie zależy od konta, więc usunięcie konta jej nie kończy.', 'Usunięcie konta kończy też subskrypcję na adres e-mail konta i usuwa ten adres z naszej listy.')),
  `revised_ats` = json_set(`revised_ats`, '$."pl-PL"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."pl-PL"'), 'Subskrypcja nie zależy od konta, więc usunięcie konta jej nie kończy.') > 0;

UPDATE `content_page`
SET
  `bodies` = json_set(`bodies`, '$."en-US"', replace(json_extract(`bodies`, '$."en-US"'), 'The subscription does not depend on an account, so deleting your account does not end it.', 'Deleting your account also ends the subscription for the account''s e-mail address and removes that address from our list.')),
  `revised_ats` = json_set(`revised_ats`, '$."en-US"', 1791633600000),
  `updated_at` = 1791633600000
WHERE `handle` = 'privacy-policy'
  AND instr(json_extract(`bodies`, '$."en-US"'), 'The subscription does not depend on an account, so deleting your account does not end it.') > 0;
