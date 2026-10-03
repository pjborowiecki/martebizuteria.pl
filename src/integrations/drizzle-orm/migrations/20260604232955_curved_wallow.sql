PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_attribute` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`handle` text(255) NOT NULL,
	`titles` text NOT NULL,
	`type` text NOT NULL,
	`unit` text(64),
	`allowed_values` text,
	`rank` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

INSERT INTO `__new_attribute` (`id`, `handle`, `titles`, `type`, `unit`, `allowed_values`, `rank`, `created_at`, `updated_at`)
SELECT
	`id`,
	`handle`,
	json_object('pl', `title`, 'en', `title`),
	`type`,
	`unit`,
	NULL,
	`rank`,
	`created_at`,
	`updated_at`
FROM `attribute`;

DROP TABLE `attribute`;
ALTER TABLE `__new_attribute` RENAME TO `attribute`;
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX IF NOT EXISTS `attribute_handle_unique` ON `attribute` (`handle`);
CREATE INDEX IF NOT EXISTS `attribute_rank_idx` ON `attribute` (`rank`);
ALTER TABLE `attribute` RENAME TO `product_attribute`;
DROP INDEX IF EXISTS `attribute_handle_unique`;
DROP INDEX IF EXISTS `attribute_rank_idx`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_attribute_handle_unique` ON `product_attribute` (`handle`);
CREATE INDEX IF NOT EXISTS `product_attribute_rank_idx` ON `product_attribute` (`rank`);
