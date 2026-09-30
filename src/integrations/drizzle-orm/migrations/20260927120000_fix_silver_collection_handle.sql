UPDATE product_collection
SET handle = 'srebro-925',
    titles = json_set(titles, '$."pl-PL"', 'Srebro 925'),
    updated_at = unixepoch() * 1000
WHERE handle = 'serbro-925';
