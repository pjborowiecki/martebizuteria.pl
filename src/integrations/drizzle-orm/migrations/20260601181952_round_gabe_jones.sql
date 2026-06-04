ALTER TABLE `collection` ADD `rank` integer DEFAULT 0 NOT NULL;
CREATE INDEX `collection_rank_idx` ON `collection` (`rank`);