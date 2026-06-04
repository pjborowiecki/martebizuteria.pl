-- Idempotent follow-up to 20260604160000 (attribute tables) and 20260604170000 (catalog unique indexes).
-- Drizzle generated CREATE TABLE for `attribute` here; remote preview already has those tables.
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_inventory` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`quantity_available` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`variant_id` text(36) NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_inventory`("id", "quantity_available", "quantity_reserved", "variant_id", "version", "created_at", "updated_at") SELECT "id", "quantity_available", "quantity_reserved", "variant_id", "version", "created_at", "updated_at" FROM `inventory`;
DROP TABLE `inventory`;
ALTER TABLE `__new_inventory` RENAME TO `inventory`;
PRAGMA foreign_keys=ON;
CREATE INDEX IF NOT EXISTS `inventory_variantId_idx` ON `inventory` (`variant_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `inventory_variantId_unique` ON `inventory` (`variant_id`);
CREATE TABLE `__new_product` (
	`category_id` text(36),
	`collection_id` text(36),
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`tags` text,
	`thumbnail` text(2048),
	`title` text(512) NOT NULL,
	`weight` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_product`("category_id", "collection_id", "description", "handle", "id", "metadata", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at") SELECT "category_id", "collection_id", "description", "handle", "id", "metadata", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at" FROM `product`;
DROP TABLE `product`;
ALTER TABLE `__new_product` RENAME TO `product`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_handle_unique` ON `product` (`handle`);
CREATE INDEX IF NOT EXISTS `product_status_createdAt_idx` ON `product` (`status`,`created_at`);
CREATE INDEX IF NOT EXISTS `product_status_updatedAt_idx` ON `product` (`status`,`updated_at`);
CREATE INDEX IF NOT EXISTS `product_category_status_idx` ON `product` (`category_id`,`status`);
CREATE INDEX IF NOT EXISTS `product_collection_status_idx` ON `product` (`collection_id`,`status`);
CREATE TABLE `__new_product_option` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`title` text(255) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_option`("id", "product_id", "title", "created_at", "updated_at") SELECT "id", "product_id", "title", "created_at", "updated_at" FROM `product_option`;
DROP TABLE `product_option`;
ALTER TABLE `__new_product_option` RENAME TO `product_option`;
CREATE INDEX IF NOT EXISTS `product_option_productId_idx` ON `product_option` (`product_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_product_title_unique` ON `product_option` (`product_id`,`title`);
CREATE TABLE `__new_product_option_value` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`option_id` text(36) NOT NULL,
	`value` text(255) NOT NULL,
	`variant_id` text(36) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_option_value`("id", "option_id", "value", "variant_id", "created_at", "updated_at") SELECT "id", "option_id", "value", "variant_id", "created_at", "updated_at" FROM `product_option_value`;
DROP TABLE `product_option_value`;
ALTER TABLE `__new_product_option_value` RENAME TO `product_option_value`;
CREATE INDEX IF NOT EXISTS `product_option_value_optionId_idx` ON `product_option_value` (`option_id`);
CREATE INDEX IF NOT EXISTS `product_option_value_variantId_idx` ON `product_option_value` (`variant_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_value_variant_option_unique` ON `product_option_value` (`variant_id`,`option_id`);
CREATE TABLE `__new_product_variant` (
	`barcode` text(255),
	`compare_at_price` integer,
	`id` text(36) PRIMARY KEY NOT NULL,
	`manage_inventory` integer DEFAULT true NOT NULL,
	`metadata` text,
	`price` integer DEFAULT 0 NOT NULL,
	`product_id` text(36) NOT NULL,
	`sku` text(255),
	`title` text(512) NOT NULL,
	`weight` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_variant`("barcode", "compare_at_price", "id", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "weight", "created_at", "updated_at") SELECT "barcode", "compare_at_price", "id", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "weight", "created_at", "updated_at" FROM `product_variant`;
DROP TABLE `product_variant`;
ALTER TABLE `__new_product_variant` RENAME TO `product_variant`;
CREATE UNIQUE INDEX IF NOT EXISTS `product_variant_sku_unique` ON `product_variant` (`sku`);
CREATE INDEX IF NOT EXISTS `product_variant_productId_idx` ON `product_variant` (`product_id`);
CREATE INDEX IF NOT EXISTS `product_variant_sku_idx` ON `product_variant` (`sku`);
