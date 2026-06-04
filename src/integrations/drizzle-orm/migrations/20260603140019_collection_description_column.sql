ALTER TABLE `collection` ADD `description` text(500);
UPDATE `collection`
SET `description` = json_extract(`metadata`, '$.description')
WHERE `metadata` IS NOT NULL
  AND json_extract(`metadata`, '$.description') IS NOT NULL;