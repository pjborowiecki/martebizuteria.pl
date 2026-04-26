DROP TABLE `product_category`;--> statement-breakpoint
DROP TABLE `product_collection`;--> statement-breakpoint
DROP TABLE `product_image`;--> statement-breakpoint
ALTER TABLE `product` ADD `category_id` text REFERENCES category(id);--> statement-breakpoint
ALTER TABLE `product` ADD `collection_id` text REFERENCES collection(id);--> statement-breakpoint
ALTER TABLE `product` ADD `images` text;--> statement-breakpoint
CREATE INDEX `product_categoryId_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_collectionId_idx` ON `product` (`collection_id`);