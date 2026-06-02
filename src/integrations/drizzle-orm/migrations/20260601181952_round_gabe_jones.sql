ALTER TABLE `collection` ADD `rank` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `collection_rank_idx` ON `collection` (`rank`);