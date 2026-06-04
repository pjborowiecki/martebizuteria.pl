-- Align index names with product_attribute (table/columns already migrated in 20260605120000 + 20260606120000).
DROP INDEX IF EXISTS `attribute_handle_unique`;
DROP INDEX IF EXISTS `attribute_rank_idx`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_attribute_handle_unique` ON `product_attribute` (`handle`);
CREATE INDEX IF NOT EXISTS `product_attribute_rank_idx` ON `product_attribute` (`rank`);
