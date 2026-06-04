PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_collection` (
	`description` text(1024),
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text(2048),
	`metadata` text,
	`rank` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text(255) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `__new_collection`("description", "handle", "id", "image", "metadata", "rank", "status", "title", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "metadata", "rank", "status", "title", "created_at", "updated_at" FROM `collection`;
DROP TABLE `collection`;
ALTER TABLE `__new_collection` RENAME TO `collection`;
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX `collection_handle_unique` ON `collection` (`handle`);
CREATE INDEX `collection_handle_idx` ON `collection` (`handle`);
CREATE INDEX `collection_rank_idx` ON `collection` (`rank`);