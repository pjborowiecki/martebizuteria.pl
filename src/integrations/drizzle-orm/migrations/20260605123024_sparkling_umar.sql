ALTER TABLE `collection_on_product` ADD `rank` integer DEFAULT 0 NOT NULL;
CREATE INDEX `collection_on_product_collection_rank_idx` ON `collection_on_product` (`collection_id`,`rank`);
ALTER TABLE `product` ADD `primary_category_id` text(36);
CREATE INDEX `product_primary_category_id_idx` ON `product` (`primary_category_id`);