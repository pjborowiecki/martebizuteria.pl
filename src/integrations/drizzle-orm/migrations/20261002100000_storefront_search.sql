CREATE VIRTUAL TABLE IF NOT EXISTS `storefront_search` USING fts5(
  `kind` UNINDEXED,
  `entity_id` UNINDEXED,
  `title`,
  `subtitle`,
  `tags`,
  `description`,
  `handle`,
  tokenize = 'unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_insert` AFTER INSERT ON `product` BEGIN
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'product',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`tags`) then json_extract(new.`tags`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`tags`) then json_extract(new.`tags`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_update` AFTER UPDATE OF `titles`, `subtitles`, `tags`, `descriptions`, `handle` ON `product` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'product' AND `entity_id` = old.`id`;
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'product',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`tags`) then json_extract(new.`tags`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`tags`) then json_extract(new.`tags`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_delete` AFTER DELETE ON `product` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'product' AND `entity_id` = old.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_category_insert` AFTER INSERT ON `product_category` BEGIN
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'category',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L') || ' ' || replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_category_update` AFTER UPDATE OF `titles`, `subtitles`, `short_descriptions`, `descriptions`, `handle` ON `product_category` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'category' AND `entity_id` = old.`id`;
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'category',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`subtitles`) then json_extract(new.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L') || ' ' || replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_category_delete` AFTER DELETE ON `product_category` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'category' AND `entity_id` = old.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_collection_insert` AFTER INSERT ON `product_collection` BEGIN
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'collection',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_collection_update` AFTER UPDATE OF `titles`, `short_descriptions`, `descriptions`, `handle` ON `product_collection` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'collection' AND `entity_id` = old.`id`;
  INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`) VALUES (
    'collection',
    new.`id`,
    replace(replace(coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`titles`) then json_extract(new.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`short_descriptions`) then json_extract(new.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(new.`descriptions`) then json_extract(new.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    new.`handle`
  );
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `storefront_search_product_collection_delete` AFTER DELETE ON `product_collection` BEGIN
  DELETE FROM `storefront_search` WHERE `kind` = 'collection' AND `entity_id` = old.`id`;
END;
--> statement-breakpoint
INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`)
SELECT
    'product',
    `product`.`id`,
    replace(replace(coalesce(case when json_valid(`product`.`titles`) then json_extract(`product`.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product`.`titles`) then json_extract(`product`.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(`product`.`subtitles`) then json_extract(`product`.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product`.`subtitles`) then json_extract(`product`.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(`product`.`tags`) then json_extract(`product`.`tags`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product`.`tags`) then json_extract(`product`.`tags`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(`product`.`descriptions`) then json_extract(`product`.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product`.`descriptions`) then json_extract(`product`.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    `product`.`handle`
FROM `product`
WHERE NOT EXISTS (SELECT 1 FROM `storefront_search` WHERE `kind` = 'product' AND `entity_id` = `product`.`id`);
--> statement-breakpoint
INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`)
SELECT
    'category',
    `product_category`.`id`,
    replace(replace(coalesce(case when json_valid(`product_category`.`titles`) then json_extract(`product_category`.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_category`.`titles`) then json_extract(`product_category`.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(`product_category`.`subtitles`) then json_extract(`product_category`.`subtitles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_category`.`subtitles`) then json_extract(`product_category`.`subtitles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(`product_category`.`short_descriptions`) then json_extract(`product_category`.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_category`.`short_descriptions`) then json_extract(`product_category`.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L') || ' ' || replace(replace(coalesce(case when json_valid(`product_category`.`descriptions`) then json_extract(`product_category`.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_category`.`descriptions`) then json_extract(`product_category`.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    `product_category`.`handle`
FROM `product_category`
WHERE NOT EXISTS (SELECT 1 FROM `storefront_search` WHERE `kind` = 'category' AND `entity_id` = `product_category`.`id`);
--> statement-breakpoint
INSERT INTO `storefront_search` (`kind`, `entity_id`, `title`, `subtitle`, `tags`, `description`, `handle`)
SELECT
    'collection',
    `product_collection`.`id`,
    replace(replace(coalesce(case when json_valid(`product_collection`.`titles`) then json_extract(`product_collection`.`titles`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_collection`.`titles`) then json_extract(`product_collection`.`titles`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    replace(replace(coalesce(case when json_valid(`product_collection`.`short_descriptions`) then json_extract(`product_collection`.`short_descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_collection`.`short_descriptions`) then json_extract(`product_collection`.`short_descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    '',
    replace(replace(coalesce(case when json_valid(`product_collection`.`descriptions`) then json_extract(`product_collection`.`descriptions`, '$."pl-PL"') end, '') || ' ' || coalesce(case when json_valid(`product_collection`.`descriptions`) then json_extract(`product_collection`.`descriptions`, '$."en-US"') end, ''), 'ł', 'l'), 'Ł', 'L'),
    `product_collection`.`handle`
FROM `product_collection`
WHERE NOT EXISTS (SELECT 1 FROM `storefront_search` WHERE `kind` = 'collection' AND `entity_id` = `product_collection`.`id`);
