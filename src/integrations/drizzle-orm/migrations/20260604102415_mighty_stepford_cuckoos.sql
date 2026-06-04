PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_category` (
	`description` text(1024),
	`handle` text(255) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`image` text(2048),
	`metadata` text,
	`parent_id` text(36),
	`rank` integer DEFAULT 0 NOT NULL,
	`short_description` text(500),
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`title` text(255) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_category`("description", "handle", "id", "image", "metadata", "parent_id", "rank", "short_description", "status", "subtitle", "title", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "metadata", "parent_id", "rank", "short_description", "status", "subtitle", "title", "created_at", "updated_at" FROM `category`;
DROP TABLE `category`;
ALTER TABLE `__new_category` RENAME TO `category`;
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX `category_handle_unique` ON `category` (`handle`);
CREATE INDEX `category_parent_rank_idx` ON `category` (`parent_id`,`rank`);
CREATE INDEX `category_status_parent_rank_idx` ON `category` (`status`,`parent_id`,`rank`);
DROP INDEX `collection_handle_idx`;
DROP INDEX `collection_rank_idx`;
CREATE INDEX `collection_status_rank_idx` ON `collection` (`status`,`rank`);
DROP INDEX `product_handle_idx`;
DROP INDEX `product_status_idx`;
DROP INDEX `product_categoryId_idx`;
DROP INDEX `product_collectionId_idx`;
CREATE INDEX `product_status_createdAt_idx` ON `product` (`status`,`created_at`);
CREATE INDEX `product_category_status_idx` ON `product` (`category_id`,`status`);
CREATE INDEX `product_collection_status_idx` ON `product` (`collection_id`,`status`);