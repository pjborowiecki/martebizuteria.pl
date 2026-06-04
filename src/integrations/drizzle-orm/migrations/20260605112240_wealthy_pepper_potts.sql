ALTER TABLE `product_attribute_value` RENAME TO `attribute_on_product`;
ALTER TABLE `product_option_value` RENAME TO `option_on_variant`;
ALTER TABLE `category` RENAME TO `product_category`;
ALTER TABLE `collection` RENAME TO `product_collection`;
CREATE TABLE `category_on_product` (
	`category_id` text(36) NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`product_id` text(36) NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`),
	FOREIGN KEY (`category_id`) REFERENCES `product_category`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `category_on_product_category_id_idx` ON `category_on_product` (`category_id`);
CREATE INDEX `category_on_product_product_id_idx` ON `category_on_product` (`product_id`);
CREATE TABLE `collection_on_product` (
	`collection_id` text(36) NOT NULL,
	`product_id` text(36) NOT NULL,
	PRIMARY KEY(`product_id`, `collection_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `product_collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `collection_on_product_collection_id_idx` ON `collection_on_product` (`collection_id`);
CREATE INDEX `collection_on_product_product_id_idx` ON `collection_on_product` (`product_id`);
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_attribute_on_product` (
	`attribute_id` text(36) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`value` text(4096) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`attribute_id`) REFERENCES `product_attribute`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_attribute_on_product`("attribute_id", "id", "product_id", "rank", "value", "created_at", "updated_at") SELECT "attribute_id", "id", "product_id", "rank", "value", "created_at", "updated_at" FROM `attribute_on_product`;
DROP TABLE `attribute_on_product`;
ALTER TABLE `__new_attribute_on_product` RENAME TO `attribute_on_product`;
PRAGMA foreign_keys=ON;
CREATE INDEX `attribute_on_product_productId_idx` ON `attribute_on_product` (`product_id`);
CREATE UNIQUE INDEX `attribute_on_product_product_attribute_uidx` ON `attribute_on_product` (`product_id`,`attribute_id`);
CREATE TABLE `__new_option_on_variant` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`option_id` text(36) NOT NULL,
	`value` text(255) NOT NULL,
	`variant_id` text(36) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_option_on_variant`("id", "option_id", "value", "variant_id", "created_at", "updated_at") SELECT "id", "option_id", "value", "variant_id", "created_at", "updated_at" FROM `option_on_variant`;
DROP TABLE `option_on_variant`;
ALTER TABLE `__new_option_on_variant` RENAME TO `option_on_variant`;
CREATE INDEX `option_on_variant_optionId_idx` ON `option_on_variant` (`option_id`);
CREATE INDEX `option_on_variant_variantId_idx` ON `option_on_variant` (`variant_id`);
CREATE UNIQUE INDEX `option_on_variant_variant_option_unique` ON `option_on_variant` (`variant_id`,`option_id`);
CREATE TABLE `__new_product_category` (
	`description` text(1024),
	`handle` text(255) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`image` text(2048),
	`metadata` text,
	`parent_id` text(36),
	`rank` integer DEFAULT 0 NOT NULL,
	`short_description` text(500),
	`status` text DEFAULT 'draft' NOT NULL,
	`subtitle` text(512),
	`title` text(255) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `product_category`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_product_category`("description", "handle", "id", "image", "metadata", "parent_id", "rank", "short_description", "status", "subtitle", "title", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "metadata", "parent_id", "rank", "short_description", "status", "subtitle", "title", "created_at", "updated_at" FROM `product_category`;
DROP TABLE `product_category`;
ALTER TABLE `__new_product_category` RENAME TO `product_category`;
CREATE UNIQUE INDEX `product_category_handle_unique` ON `product_category` (`handle`);
CREATE INDEX `product_category_parent_rank_idx` ON `product_category` (`parent_id`,`rank`);
CREATE INDEX `product_category_status_parent_rank_idx` ON `product_category` (`status`,`parent_id`,`rank`);
DROP INDEX `collection_handle_unique`;
DROP INDEX `collection_status_rank_idx`;
CREATE UNIQUE INDEX `product_collection_handle_unique` ON `product_collection` (`handle`);
CREATE INDEX `product_collection_status_rank_idx` ON `product_collection` (`status`,`rank`);
CREATE TABLE `__new_product` (
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
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `__new_product`("description", "handle", "id", "metadata", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at") SELECT "description", "handle", "id", "metadata", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at" FROM `product`;
DROP TABLE `product`;
ALTER TABLE `__new_product` RENAME TO `product`;
CREATE UNIQUE INDEX `product_handle_unique` ON `product` (`handle`);
CREATE INDEX `product_status_createdAt_idx` ON `product` (`status`,`created_at`);
CREATE INDEX `product_status_updatedAt_idx` ON `product` (`status`,`updated_at`);