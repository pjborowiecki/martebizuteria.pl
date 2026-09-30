UPDATE product
SET titles = json_object('pl-PL', coalesce(json_extract(titles, '$.pl'), ''), 'en-US', coalesce(json_extract(titles, '$.en'), ''))
WHERE titles IS NOT NULL AND (json_type(titles, '$.pl') IS NOT NULL OR json_type(titles, '$.en') IS NOT NULL);

UPDATE product
SET subtitles = json_object('pl-PL', coalesce(json_extract(subtitles, '$.pl'), ''), 'en-US', coalesce(json_extract(subtitles, '$.en'), ''))
WHERE subtitles IS NOT NULL AND (json_type(subtitles, '$.pl') IS NOT NULL OR json_type(subtitles, '$.en') IS NOT NULL);

UPDATE product
SET descriptions = json_object(
  'pl-PL', coalesce(json_extract(descriptions, '$.pl'), ''),
  'en-US', coalesce(json_extract(descriptions, '$.en'), '')
)
WHERE descriptions IS NOT NULL AND (json_type(descriptions, '$.pl') IS NOT NULL OR json_type(descriptions, '$.en') IS NOT NULL);

UPDATE product
SET tags = json_object(
  'pl-PL', json(coalesce(json_extract(tags, '$.pl'), '[]')),
  'en-US', json(coalesce(json_extract(tags, '$.en'), '[]'))
)
WHERE tags IS NOT NULL AND (json_type(tags, '$.pl') IS NOT NULL OR json_type(tags, '$.en') IS NOT NULL);

UPDATE product_category
SET titles = json_object('pl-PL', coalesce(json_extract(titles, '$.pl'), ''), 'en-US', coalesce(json_extract(titles, '$.en'), ''))
WHERE titles IS NOT NULL AND (json_type(titles, '$.pl') IS NOT NULL OR json_type(titles, '$.en') IS NOT NULL);

UPDATE product_category
SET subtitles = json_object('pl-PL', coalesce(json_extract(subtitles, '$.pl'), ''), 'en-US', coalesce(json_extract(subtitles, '$.en'), ''))
WHERE subtitles IS NOT NULL AND (json_type(subtitles, '$.pl') IS NOT NULL OR json_type(subtitles, '$.en') IS NOT NULL);

UPDATE product_category
SET short_descriptions = json_object(
  'pl-PL', coalesce(json_extract(short_descriptions, '$.pl'), ''),
  'en-US', coalesce(json_extract(short_descriptions, '$.en'), '')
)
WHERE short_descriptions IS NOT NULL
  AND (json_type(short_descriptions, '$.pl') IS NOT NULL OR json_type(short_descriptions, '$.en') IS NOT NULL);

UPDATE product_category
SET descriptions = json_object(
  'pl-PL', coalesce(json_extract(descriptions, '$.pl'), ''),
  'en-US', coalesce(json_extract(descriptions, '$.en'), '')
)
WHERE descriptions IS NOT NULL AND (json_type(descriptions, '$.pl') IS NOT NULL OR json_type(descriptions, '$.en') IS NOT NULL);

UPDATE product_collection
SET titles = json_object('pl-PL', coalesce(json_extract(titles, '$.pl'), ''), 'en-US', coalesce(json_extract(titles, '$.en'), ''))
WHERE titles IS NOT NULL AND (json_type(titles, '$.pl') IS NOT NULL OR json_type(titles, '$.en') IS NOT NULL);

UPDATE product_collection
SET descriptions = json_object(
  'pl-PL', coalesce(json_extract(descriptions, '$.pl'), ''),
  'en-US', coalesce(json_extract(descriptions, '$.en'), '')
)
WHERE descriptions IS NOT NULL AND (json_type(descriptions, '$.pl') IS NOT NULL OR json_type(descriptions, '$.en') IS NOT NULL);

UPDATE product_attribute
SET titles = json_object('pl-PL', coalesce(json_extract(titles, '$.pl'), ''), 'en-US', coalesce(json_extract(titles, '$.en'), ''))
WHERE titles IS NOT NULL AND (json_type(titles, '$.pl') IS NOT NULL OR json_type(titles, '$.en') IS NOT NULL);

UPDATE product_attribute
SET allowed_values = (
  SELECT json_group_array(json(json_object(
    'labels', json(json_object(
      'pl-PL', coalesce(json_extract(entry.value, '$.labels.pl'), ''),
      'en-US', coalesce(json_extract(entry.value, '$.labels.en'), '')
    )),
    'value', json_extract(entry.value, '$.value')
  )))
  FROM json_each(product_attribute.allowed_values) AS entry
)
WHERE allowed_values IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM json_each(product_attribute.allowed_values) AS probe
    WHERE json_type(probe.value, '$.labels.pl') IS NOT NULL OR json_type(probe.value, '$.labels.en') IS NOT NULL
  );

UPDATE product_option
SET titles = json_object('pl-PL', coalesce(json_extract(titles, '$.pl'), ''), 'en-US', coalesce(json_extract(titles, '$.en'), ''))
WHERE titles IS NOT NULL AND (json_type(titles, '$.pl') IS NOT NULL OR json_type(titles, '$.en') IS NOT NULL);

UPDATE product_option_value
SET labels = json_object('pl-PL', coalesce(json_extract(labels, '$.pl'), ''), 'en-US', coalesce(json_extract(labels, '$.en'), ''))
WHERE labels IS NOT NULL AND (json_type(labels, '$.pl') IS NOT NULL OR json_type(labels, '$.en') IS NOT NULL);
