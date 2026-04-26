CREATE TABLE `category` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`name` text(255) NOT NULL,
	`parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_handle_unique` ON `category` (`handle`);--> statement-breakpoint
CREATE INDEX `category_handle_idx` ON `category` (`handle`);--> statement-breakpoint
CREATE INDEX `category_parentId_idx` ON `category` (`parent_id`);--> statement-breakpoint
CREATE TABLE `collection` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`title` text(255) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_handle_unique` ON `collection` (`handle`);--> statement-breakpoint
CREATE INDEX `collection_handle_idx` ON `collection` (`handle`);--> statement-breakpoint
CREATE TABLE `customer` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`email` text(320) NOT NULL,
	`first_name` text(256),
	`has_account` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`last_name` text(256),
	`metadata` text,
	`phone` text(32),
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_email_unique` ON `customer` (`email`);--> statement-breakpoint
CREATE INDEX `customer_email_idx` ON `customer` (`email`);--> statement-breakpoint
CREATE TABLE `customer_address` (
	`address1` text(512) NOT NULL,
	`address2` text(512),
	`city` text(256) NOT NULL,
	`country_code` text(2) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`customer_id` text NOT NULL,
	`first_name` text(256),
	`id` text PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last_name` text(256),
	`phone` text(32),
	`postal_code` text(32),
	`province` text(256),
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customer_address_customerId_idx` ON `customer_address` (`customer_id`);--> statement-breakpoint
CREATE TABLE `order` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`currency_code` text(3) DEFAULT 'PLN' NOT NULL,
	`customer_id` text,
	`discount_total` real DEFAULT 0 NOT NULL,
	`email` text(320) NOT NULL,
	`fulfillment_status` text(32) DEFAULT 'not_fulfilled' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`payment_status` text(32) DEFAULT 'awaiting' NOT NULL,
	`shipping_total` real DEFAULT 0 NOT NULL,
	`status` text(32) DEFAULT 'pending' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_total` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_customerId_idx` ON `order` (`customer_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `order_createdAt_idx` ON `order` (`created_at`);--> statement-breakpoint
CREATE TABLE `order_address` (
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
	`type` text(16) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_address_orderId_idx` ON `order_address` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_address_type_idx` ON `order_address` (`type`);--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`order_id` text NOT NULL,
	`product_id` text,
	`quantity` integer NOT NULL,
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`unit_price` real NOT NULL,
	`variant_id` text,
	`variant_title` text(512),
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_item_orderId_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE TABLE `product` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text,
	`status` text(32) DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`weight` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_handle_unique` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_handle_idx` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE TABLE `product_category` (
	`category_id` text NOT NULL,
	`product_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`),
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_category_categoryId_idx` ON `product_category` (`category_id`);--> statement-breakpoint
CREATE TABLE `product_collection` (
	`collection_id` text NOT NULL,
	`product_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `collection_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_collection_collectionId_idx` ON `product_collection` (`collection_id`);--> statement-breakpoint
CREATE TABLE `product_image` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`product_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`url` text(2048) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_image_productId_idx` ON `product_image` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_option` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text(128) NOT NULL,
	`product_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_option_productId_idx` ON `product_option` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_option_value` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`option_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`value` text(512) NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_option_value_optionId_idx` ON `product_option_value` (`option_id`);--> statement-breakpoint
CREATE TABLE `product_variant` (
	`allow_backorder` integer DEFAULT false NOT NULL,
	`barcode` text(255),
	`compare_at_price` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`inventory_quantity` integer DEFAULT 0 NOT NULL,
	`manage_inventory` integer DEFAULT true NOT NULL,
	`metadata` text,
	`price` real DEFAULT 0 NOT NULL,
	`product_id` text NOT NULL,
	`sku` text(255),
	`title` text(512) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`weight` real,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variant_productId_idx` ON `product_variant` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_variant_sku_idx` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE TABLE `product_variant_option_value` (
	`option_value_id` text NOT NULL,
	`variant_id` text NOT NULL,
	PRIMARY KEY(`variant_id`, `option_value_id`),
	FOREIGN KEY (`option_value_id`) REFERENCES `product_option_value`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_variant_option_value_optionValueId_idx` ON `product_variant_option_value` (`option_value_id`);