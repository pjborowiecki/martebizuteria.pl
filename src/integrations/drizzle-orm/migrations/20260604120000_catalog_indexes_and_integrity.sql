-- Idempotent index cleanup (no table rebuild). Safe after 20260604102415_mighty_stepford_cuckoos.
DROP INDEX IF EXISTS `category_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `category_parentId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `category_rank_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `category_parent_rank_idx` ON `category` (`parent_id`,`rank`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `category_status_parent_rank_idx` ON `category` (`status`,`parent_id`,`rank`);--> statement-breakpoint
DROP INDEX IF EXISTS `collection_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `collection_rank_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `collection_status_rank_idx` ON `collection` (`status`,`rank`);--> statement-breakpoint
DROP INDEX IF EXISTS `product_handle_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `product_status_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `product_categoryId_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `product_collectionId_idx`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_status_createdAt_idx` ON `product` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_category_status_idx` ON `product` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_collection_status_idx` ON `product` (`collection_id`,`status`);
