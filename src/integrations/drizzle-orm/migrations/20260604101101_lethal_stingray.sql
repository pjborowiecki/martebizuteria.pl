ALTER TABLE `category` RENAME COLUMN "position" TO "rank";--> statement-breakpoint
CREATE INDEX `category_rank_idx` ON `category` (`rank`);