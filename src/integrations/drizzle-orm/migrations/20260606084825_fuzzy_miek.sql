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