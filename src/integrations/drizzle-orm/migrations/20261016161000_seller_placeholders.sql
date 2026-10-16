UPDATE `content_page`
SET
  `bodies` = json_set(
    `bodies`,
    '$."pl-PL"',
    replace(replace(replace(replace(replace(replace(replace(replace(replace(json_extract(`bodies`, '$."pl-PL"'), '[kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl)', ':seller[emailLink]'), '[+48 663 150 820](tel:+48663150820)', ':seller[phoneLink]'), 'Pyciak Mariusz Firma Jubilerska', ':seller[legalName]'), ':seller[legalName]\
ul. Wąska 11', ':seller[legalName]\
:seller[street]'), ':seller[legalName], ul. Wąska 11, 32-700 Bochnia, Poland, ', ':seller[legalName], :seller[street], :seller[postalCode] :seller[city], :seller[country], '), '32-700 Bochnia\
Poland', ':seller[postalCode] :seller[city]\
:seller[country]'), '32-700 Bochnia', ':seller[postalCode] :seller[city]'), '8681772646', ':seller[nip]'), '384616568', ':seller[regon]'),
    '$."en-US"',
    replace(replace(replace(replace(replace(replace(replace(replace(replace(json_extract(`bodies`, '$."en-US"'), '[kontakt@martebizuteria.pl](mailto:kontakt@martebizuteria.pl)', ':seller[emailLink]'), '[+48 663 150 820](tel:+48663150820)', ':seller[phoneLink]'), 'Pyciak Mariusz Firma Jubilerska', ':seller[legalName]'), ':seller[legalName]\
ul. Wąska 11', ':seller[legalName]\
:seller[street]'), ':seller[legalName], ul. Wąska 11, 32-700 Bochnia, Poland, ', ':seller[legalName], :seller[street], :seller[postalCode] :seller[city], :seller[country], '), '32-700 Bochnia\
Poland', ':seller[postalCode] :seller[city]\
:seller[country]'), '32-700 Bochnia', ':seller[postalCode] :seller[city]'), '8681772646', ':seller[nip]'), '384616568', ':seller[regon]')
  )
WHERE `handle` IN ('terms-of-service', 'privacy-policy', 'exchanges-and-returns', 'faq')
  AND (instr(`bodies`, 'mailto:kontakt@martebizuteria.pl') > 0
    OR instr(`bodies`, 'tel:+48663150820') > 0
    OR instr(`bodies`, 'Pyciak Mariusz Firma Jubilerska') > 0
    OR instr(`bodies`, '32-700 Bochnia') > 0
    OR instr(`bodies`, '8681772646') > 0
    OR instr(`bodies`, '384616568') > 0
  );
