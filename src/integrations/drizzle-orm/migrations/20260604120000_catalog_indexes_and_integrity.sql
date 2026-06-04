-- Idempotent index cleanup (no table rebuild). Safe after 20260604102415_mighty_stepford_cuckoos.
DROP INDEX IF EXISTS `category_handle_idx`;
DROP INDEX IF EXISTS `category_parentId_idx`;
DROP INDEX IF EXISTS `category_rank_idx`;
CREATE INDEX IF NOT EXISTS `category_parent_rank_idx` ON `category` (`parent_id`,`rank`);
CREATE INDEX IF NOT EXISTS `category_status_parent_rank_idx` ON `category` (`status`,`parent_id`,`rank`);
DROP INDEX IF EXISTS `collection_handle_idx`;
DROP INDEX IF EXISTS `collection_rank_idx`;
CREATE INDEX IF NOT EXISTS `collection_status_rank_idx` ON `collection` (`status`,`rank`);
DROP INDEX IF EXISTS `product_handle_idx`;
DROP INDEX IF EXISTS `product_status_idx`;
DROP INDEX IF EXISTS `product_categoryId_idx`;
DROP INDEX IF EXISTS `product_collectionId_idx`;
CREATE INDEX IF NOT EXISTS `product_status_createdAt_idx` ON `product` (`status`,`created_at`);
CREATE INDEX IF NOT EXISTS `product_category_status_idx` ON `product` (`category_id`,`status`);
CREATE INDEX IF NOT EXISTS `product_collection_status_idx` ON `product` (`collection_id`,`status`);
