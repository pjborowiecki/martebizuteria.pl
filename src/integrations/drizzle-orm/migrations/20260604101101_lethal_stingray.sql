ALTER TABLE `category` RENAME COLUMN "position" TO "rank";
CREATE INDEX `category_rank_idx` ON `category` (`rank`);