PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_order` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`currency_code` text(3) DEFAULT 'PLN' NOT NULL,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`email` text(320) NOT NULL,
	`fulfillment_status` text DEFAULT 'not_fulfilled' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`payment_status` text DEFAULT 'awaiting' NOT NULL,
	`shipping_total` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_order`("created_at", "currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "updated_at", "user_id") SELECT "created_at", "currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "updated_at", "user_id" FROM `order`;
DROP TABLE `order`;
ALTER TABLE `__new_order` RENAME TO `order`;
PRAGMA foreign_keys=ON;
CREATE INDEX `order_userId_idx` ON `order` (`user_id`);
CREATE INDEX `order_status_idx` ON `order` (`status`);
CREATE INDEX `order_createdAt_idx` ON `order` (`created_at`);
CREATE TABLE `__new_order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`order_id` text NOT NULL,
	`product_id` text,
	`quantity` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`total` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`variant_id` text,
	`variant_title` text(512),
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_order_item`("id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title") SELECT "id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title" FROM `order_item`;
DROP TABLE `order_item`;
ALTER TABLE `__new_order_item` RENAME TO `order_item`;
CREATE INDEX `order_item_orderId_idx` ON `order_item` (`order_id`);
CREATE TABLE `__new_product_variant` (
	`allow_backorder` integer DEFAULT false NOT NULL,
	`barcode` text(255),
	`compare_at_price` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`inventory_quantity` integer DEFAULT 0 NOT NULL,
	`manage_inventory` integer DEFAULT true NOT NULL,
	`metadata` text,
	`price` integer DEFAULT 0 NOT NULL,
	`product_id` text NOT NULL,
	`sku` text(255),
	`title` text(512) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`weight` real,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_variant`("allow_backorder", "barcode", "compare_at_price", "created_at", "id", "inventory_quantity", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "updated_at", "weight") SELECT "allow_backorder", "barcode", "compare_at_price", "created_at", "id", "inventory_quantity", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "updated_at", "weight" FROM `product_variant`;
DROP TABLE `product_variant`;
ALTER TABLE `__new_product_variant` RENAME TO `product_variant`;
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);
CREATE INDEX `product_variant_productId_idx` ON `product_variant` (`product_id`);
CREATE INDEX `product_variant_sku_idx` ON `product_variant` (`sku`);