CREATE TABLE `attribute` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`handle` text(255) NOT NULL,
	`title` text(255) NOT NULL,
	`type` text NOT NULL,
	`unit` text(64),
	`group` text(128),
	`rank` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `attribute_handle_unique` ON `attribute` (`handle`);
CREATE INDEX `attribute_rank_idx` ON `attribute` (`rank`);
CREATE TABLE `product_attribute_value` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`attribute_id` text(36) NOT NULL,
	`value` text(4096) NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`id`) ON UPDATE no action ON DELETE restrict
);

CREATE INDEX `product_attribute_value_productId_idx` ON `product_attribute_value` (`product_id`);
CREATE UNIQUE INDEX `product_attribute_value_product_attribute_uidx` ON `product_attribute_value` (`product_id`,`attribute_id`);
CREATE TABLE `product_image` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`url` text(2048) NOT NULL,
	`alt` text(512),
	`rank` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `product_image_productId_rank_idx` ON `product_image` (`product_id`,`rank`);
ALTER TABLE `product` DROP COLUMN `images`;
