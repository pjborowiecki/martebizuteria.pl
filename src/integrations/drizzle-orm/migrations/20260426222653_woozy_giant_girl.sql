PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_order` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`currency_code` text(3) DEFAULT 'PLN' NOT NULL,
	`discount_total` real DEFAULT 0 NOT NULL,
	`email` text(320) NOT NULL,
	`fulfillment_status` text DEFAULT 'not_fulfilled' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`payment_status` text DEFAULT 'awaiting' NOT NULL,
	`shipping_total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_total` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_order`("created_at", "currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "updated_at", "user_id") SELECT "created_at", "currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "updated_at", "user_id" FROM `order`;--> statement-breakpoint
DROP TABLE `order`;--> statement-breakpoint
ALTER TABLE `__new_order` RENAME TO `order`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `order_userId_idx` ON `order` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `order_createdAt_idx` ON `order` (`created_at`);--> statement-breakpoint
CREATE TABLE `__new_order_address` (
	`address1` text(512) NOT NULL,
	`address2` text(512),
	`city` text(256) NOT NULL,
	`country_code` text(2) NOT NULL,
	`first_name` text(256) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_name` text(256) NOT NULL,
	`order_id` text NOT NULL,
	`phone` text(32),
	`postal_code` text(32),
	`province` text(256),
	`type` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_order_address`("address1", "address2", "city", "country_code", "first_name", "id", "last_name", "order_id", "phone", "postal_code", "province", "type") SELECT "address1", "address2", "city", "country_code", "first_name", "id", "last_name", "order_id", "phone", "postal_code", "province", "type" FROM `order_address`;--> statement-breakpoint
DROP TABLE `order_address`;--> statement-breakpoint
ALTER TABLE `__new_order_address` RENAME TO `order_address`;--> statement-breakpoint
CREATE INDEX `order_address_orderId_idx` ON `order_address` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_address_type_idx` ON `order_address` (`type`);--> statement-breakpoint
CREATE TABLE `__new_product` (
	`category_id` text,
	`collection_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`images` text,
	`metadata` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`weight` real,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_product`("category_id", "collection_id", "created_at", "description", "handle", "id", "images", "metadata", "status", "subtitle", "thumbnail", "title", "updated_at", "weight") SELECT "category_id", "collection_id", "created_at", "description", "handle", "id", "images", "metadata", "status", "subtitle", "thumbnail", "title", "updated_at", "weight" FROM `product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
ALTER TABLE `__new_product` RENAME TO `product`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_handle_unique` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_handle_idx` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `product_categoryId_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_collectionId_idx` ON `product` (`collection_id`);