CREATE TABLE `discount` (
	`code` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`ends_at` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`starts_at` text,
	`type` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`usage_limit` integer,
	`value` integer NOT NULL
);

CREATE UNIQUE INDEX `discount_code_unique` ON `discount` (`code`);
CREATE INDEX `discount_code_idx` ON `discount` (`code`);
CREATE TABLE `product_option` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `product_option_productId_idx` ON `product_option` (`product_id`);
CREATE TABLE `product_option_value` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`option_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`value` text NOT NULL,
	`variant_id` text NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `product_option_value_optionId_idx` ON `product_option_value` (`option_id`);
CREATE INDEX `product_option_value_variantId_idx` ON `product_option_value` (`variant_id`);
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_address` (
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
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_address`("address1", "address2", "city", "country_code", "created_at", "first_name", "id", "is_default", "last_name", "phone", "postal_code", "province", "updated_at", "user_id") SELECT "address1", "address2", "city", "country_code", "created_at", "first_name", "id", "is_default", "last_name", "phone", "postal_code", "province", "updated_at", "user_id" FROM `address`;
DROP TABLE `address`;
ALTER TABLE `__new_address` RENAME TO `address`;
PRAGMA foreign_keys=ON;
CREATE INDEX `address_userId_idx` ON `address` (`user_id`);
ALTER TABLE `cart` ADD `discount_id` text;
ALTER TABLE `category` ADD `seo_description` text;
ALTER TABLE `category` ADD `seo_title` text;
ALTER TABLE `checkout` ADD `customer_note` text;
ALTER TABLE `checkout` ADD `discount_id` text;
ALTER TABLE `collection` ADD `seo_description` text;
ALTER TABLE `collection` ADD `seo_title` text;
ALTER TABLE `order` ADD `canceled_at` text;
ALTER TABLE `order` ADD `customer_note` text;
ALTER TABLE `order` ADD `delivered_at` text;
ALTER TABLE `order` ADD `discount_id` text;
ALTER TABLE `order` ADD `shipped_at` text;
ALTER TABLE `order` ADD `tracking_number` text;
ALTER TABLE `order` ADD `tracking_url` text(2048);
ALTER TABLE `payment` ADD `refunded_amount` integer DEFAULT 0 NOT NULL;
ALTER TABLE `payment` ADD `refunded_at` text;
ALTER TABLE `product` ADD `seo_description` text;
ALTER TABLE `product` ADD `seo_title` text;
ALTER TABLE `product` ADD `tags` text;
ALTER TABLE `user` ADD `stripe_customer_id` text;