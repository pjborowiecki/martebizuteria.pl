PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_product` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`handle` text(255) NOT NULL,
	`titles` text NOT NULL,
	`subtitles` text,
	`descriptions` text,
	`tags` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`thumbnail` text(2048),
	`weight` real,
	`metadata` text,
	`primary_category_id` text(36),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`primary_category_id`) REFERENCES `product_category`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_product` (`id`, `handle`, `titles`, `subtitles`, `descriptions`, `tags`, `status`, `thumbnail`, `weight`, `metadata`, `primary_category_id`, `created_at`, `updated_at`)
SELECT
	`id`,
	`handle`,
	json_object('pl', `title`, 'en', `title`),
	CASE
		WHEN `subtitle` IS NULL OR trim(`subtitle`) = '' THEN NULL
		ELSE json_object('pl', `subtitle`, 'en', `subtitle`)
	END,
	CASE
		WHEN `description` IS NULL OR trim(`description`) = '' THEN NULL
		ELSE json_object('pl', `description`, 'en', `description`)
	END,
	CASE
		WHEN `tags` IS NULL OR trim(`tags`) = '' OR trim(`tags`) = '[]' THEN NULL
		ELSE json_object('pl', json(`tags`), 'en', json(`tags`))
	END,
	`status`,
	`thumbnail`,
	`weight`,
	`metadata`,
	`primary_category_id`,
	`created_at`,
	`updated_at`
FROM `product`;

DROP TABLE `product`;
ALTER TABLE `__new_product` RENAME TO `product`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_handle_unique` ON `product` (`handle`);
CREATE INDEX IF NOT EXISTS `product_primary_category_id_idx` ON `product` (`primary_category_id`);
CREATE INDEX IF NOT EXISTS `product_status_createdAt_idx` ON `product` (`status`, `created_at`);
CREATE INDEX IF NOT EXISTS `product_status_updatedAt_idx` ON `product` (`status`, `updated_at`);
PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_product` (
	`descriptions` text,
	`handle` text(255) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`metadata` text,
	`primary_category_id` text(36),
	`rank` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitles` text,
	`tags` text,
	`thumbnail` text(2048),
	`titles` text NOT NULL,
	`weight` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `__new_product`("descriptions", "handle", "id", "metadata", "primary_category_id", "rank", "status", "subtitles", "tags", "thumbnail", "titles", "weight", "created_at", "updated_at") SELECT "descriptions", "handle", "id", "metadata", "primary_category_id", "rank", "status", "subtitles", "tags", "thumbnail", "titles", "weight", "created_at", "updated_at" FROM `product`;
DROP TABLE `product`;
ALTER TABLE `__new_product` RENAME TO `product`;
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX `product_handle_unique` ON `product` (`handle`);
CREATE INDEX `product_primary_category_id_idx` ON `product` (`primary_category_id`);
CREATE INDEX `product_rank_idx` ON `product` (`rank`);
CREATE INDEX `product_status_createdAt_idx` ON `product` (`status`,`created_at`);
CREATE INDEX `product_status_rank_idx` ON `product` (`status`,`rank`);
CREATE INDEX `product_status_updatedAt_idx` ON `product` (`status`,`updated_at`);