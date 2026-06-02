PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
--> statement-breakpoint
INSERT INTO `__new_collection`("description", "handle", "id", "image", "metadata", "rank", "status", "title", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "metadata", "rank", "status", "title", "created_at", "updated_at" FROM `collection`;--> statement-breakpoint
DROP TABLE `collection`;--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `collection_handle_unique` ON `collection` (`handle`);--> statement-breakpoint
CREATE INDEX `collection_handle_idx` ON `collection` (`handle`);--> statement-breakpoint
CREATE INDEX `collection_rank_idx` ON `collection` (`rank`);