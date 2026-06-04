DROP TABLE `product_category`;
DROP TABLE `product_collection`;
DROP TABLE `product_image`;
ALTER TABLE `product` ADD `category_id` text REFERENCES category(id);
ALTER TABLE `product` ADD `collection_id` text REFERENCES collection(id);
ALTER TABLE `product` ADD `images` text;
CREATE INDEX `product_categoryId_idx` ON `product` (`category_id`);
CREATE INDEX `product_collectionId_idx` ON `product` (`collection_id`);