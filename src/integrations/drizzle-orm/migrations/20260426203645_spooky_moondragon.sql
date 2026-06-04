PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`order_id` text NOT NULL,
	`product_id` text,
	`quantity` text NOT NULL,
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`unit_price` text NOT NULL,
	`variant_id` text,
	`variant_title` text(512),
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_order_item`("id", "metadata", "order_id", "product_id", "quantity", "thumbnail", "title", "unit_price", "variant_id", "variant_title") SELECT "id", "metadata", "order_id", "product_id", "quantity", "thumbnail", "title", "unit_price", "variant_id", "variant_title" FROM `order_item`;
DROP TABLE `order_item`;
ALTER TABLE `__new_order_item` RENAME TO `order_item`;
PRAGMA foreign_keys=ON;
CREATE INDEX `order_item_orderId_idx` ON `order_item` (`order_id`);