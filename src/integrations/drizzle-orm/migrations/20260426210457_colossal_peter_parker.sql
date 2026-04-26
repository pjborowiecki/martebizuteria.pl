CREATE TABLE `address` (
	`address1` text(512) NOT NULL,
	`address2` text(512),
	`city` text(256) NOT NULL,
	`country_code` text(2) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`first_name` text(256),
	`id` text PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last_name` text(256),
	`phone` text(32),
	`postal_code` text(32),
	`province` text(256),
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `address_userId_idx` ON `address` (`user_id`);--> statement-breakpoint
DROP TABLE `customer`;--> statement-breakpoint
DROP TABLE `customer_address`;--> statement-breakpoint
DROP TABLE `product_option`;--> statement-breakpoint
DROP TABLE `product_option_value`;--> statement-breakpoint
DROP TABLE `product_variant_option_value`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_order` (
	`currency_code` text(3) DEFAULT 'PLN' NOT NULL,
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
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_order`("currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "created_at", "updated_at", "user_id") SELECT "currency_code", "discount_total", "email", "fulfillment_status", "id", "metadata", "payment_status", "shipping_total", "status", "subtotal", "tax_total", "total", "created_at", "updated_at", "user_id" FROM `order`;--> statement-breakpoint
DROP TABLE `order`;--> statement-breakpoint
ALTER TABLE `__new_order` RENAME TO `order`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `order_userId_idx` ON `order` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `order_createdAt_idx` ON `order` (`created_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `metadata` text;--> statement-breakpoint
ALTER TABLE `user` ADD `phone` text(32);