-- Category/collection scalar copy → localized JSON maps (pl/en), same pattern as product_attribute.titles.
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_product_category` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`handle` text(255) NOT NULL,
	`titles` text NOT NULL,
	`subtitles` text,
	`short_descriptions` text,
	`descriptions` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`image` text(2048),
	`metadata` text,
	`parent_id` text(36),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `product_category`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_product_category` (`id`, `handle`, `titles`, `subtitles`, `short_descriptions`, `descriptions`, `status`, `rank`, `image`, `metadata`, `parent_id`, `created_at`, `updated_at`)
SELECT
	`id`,
	`handle`,
	json_object('pl', `title`, 'en', `title`),
	CASE
		WHEN `subtitle` IS NULL OR trim(`subtitle`) = '' THEN NULL
		ELSE json_object('pl', `subtitle`, 'en', `subtitle`)
	END,
	CASE
		WHEN `short_description` IS NULL OR trim(`short_description`) = '' THEN NULL
		ELSE json_object('pl', `short_description`, 'en', `short_description`)
	END,
	CASE
		WHEN `description` IS NULL OR trim(`description`) = '' THEN NULL
		ELSE json_object('pl', `description`, 'en', `description`)
	END,
	`status`,
	`rank`,
	`image`,
	`metadata`,
	`parent_id`,
	`created_at`,
	`updated_at`
FROM `product_category`;

DROP TABLE `product_category`;
ALTER TABLE `__new_product_category` RENAME TO `product_category`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_category_handle_unique` ON `product_category` (`handle`);
CREATE INDEX IF NOT EXISTS `product_category_parent_rank_idx` ON `product_category` (`parent_id`,`rank`);
CREATE INDEX IF NOT EXISTS `product_category_status_parent_rank_idx` ON `product_category` (`status`,`parent_id`,`rank`);
CREATE TABLE `__new_product_collection` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`handle` text(255) NOT NULL,
	`titles` text NOT NULL,
	`descriptions` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`image` text(2048),
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

INSERT INTO `__new_product_collection` (`id`, `handle`, `titles`, `descriptions`, `status`, `rank`, `image`, `metadata`, `created_at`, `updated_at`)
SELECT
	`id`,
	`handle`,
	json_object('pl', `title`, 'en', `title`),
	CASE
		WHEN `description` IS NULL OR trim(`description`) = '' THEN NULL
		ELSE json_object('pl', `description`, 'en', `description`)
	END,
	`status`,
	`rank`,
	`image`,
	`metadata`,
	`created_at`,
	`updated_at`
FROM `product_collection`;

DROP TABLE `product_collection`;
ALTER TABLE `__new_product_collection` RENAME TO `product_collection`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_collection_handle_unique` ON `product_collection` (`handle`);
CREATE INDEX IF NOT EXISTS `product_collection_status_rank_idx` ON `product_collection` (`status`,`rank`);
PRAGMA foreign_keys=ON;
