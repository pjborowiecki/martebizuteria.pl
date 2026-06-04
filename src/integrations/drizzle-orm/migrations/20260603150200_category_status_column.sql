PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_category` (
	`description` text(1024),
	`handle` text(255) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`image` text(2048),
	`metadata` text,
	`name` text(255) NOT NULL,
	`parent_id` text(36),
	`position` integer DEFAULT 0 NOT NULL,
	`seo_description` text(500),
	`short_description` text(500),
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `__new_category`("description", "handle", "id", "image", "metadata", "name", "parent_id", "position", "seo_description", "short_description", "status", "subtitle", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "metadata", "name", "parent_id", "position", "seo_description", "short_description", CASE WHEN "is_active" = 1 THEN 'active' ELSE 'draft' END, "subtitle", "created_at", "updated_at" FROM `category`;
DROP TABLE `category`;
ALTER TABLE `__new_category` RENAME TO `category`;
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX `category_handle_unique` ON `category` (`handle`);
CREATE INDEX `category_handle_idx` ON `category` (`handle`);
CREATE INDEX `category_parentId_idx` ON `category` (`parent_id`);
