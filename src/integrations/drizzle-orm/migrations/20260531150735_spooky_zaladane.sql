PRAGMA defer_foreign_keys=true;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`access_token` text(16384),
	`access_token_expires_at` integer,
	`account_id` text(1024) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`id_token` text(16384),
	`password` text(512),
	`provider_id` text(128) NOT NULL,
	`refresh_token` text(16384),
	`refresh_token_expires_at` integer,
	`scope` text(8192),
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account`("access_token", "access_token_expires_at", "account_id", "id", "id_token", "password", "provider_id", "refresh_token", "refresh_token_expires_at", "scope", "user_id", "created_at", "updated_at") SELECT "access_token", "access_token_expires_at", "account_id", "id", "id_token", "password", "provider_id", "refresh_token", "refresh_token_expires_at", "scope", "user_id", "created_at", "updated_at" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_address` (
	`address1` text(512) NOT NULL,
	`address2` text(512),
	`city` text(256) NOT NULL,
	`country_code` text(2) NOT NULL,
	`first_name` text(256),
	`id` text PRIMARY KEY NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last_name` text(256),
	`phone` text(32),
	`postal_code` text(32),
	`province` text(256),
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_address`("address1", "address2", "city", "country_code", "first_name", "id", "is_default", "last_name", "phone", "postal_code", "province", "user_id", "created_at", "updated_at") SELECT "address1", "address2", "city", "country_code", "first_name", "id", "is_default", "last_name", "phone", "postal_code", "province", "user_id", "created_at", "updated_at" FROM `address`;--> statement-breakpoint
DROP TABLE `address`;--> statement-breakpoint
ALTER TABLE `__new_address` RENAME TO `address`;--> statement-breakpoint
CREATE INDEX `address_userId_idx` ON `address` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_cart` (
	`discount_id` text,
	`expires_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_cart`("discount_id", "expires_at", "id", "session_id", "user_id", "created_at", "updated_at") SELECT "discount_id", "expires_at", "id", "session_id", "user_id", "created_at", "updated_at" FROM `cart`;--> statement-breakpoint
DROP TABLE `cart`;--> statement-breakpoint
ALTER TABLE `__new_cart` RENAME TO `cart`;--> statement-breakpoint
CREATE INDEX `cart_userId_idx` ON `cart` (`user_id`);--> statement-breakpoint
CREATE INDEX `cart_sessionId_idx` ON `cart` (`session_id`);--> statement-breakpoint
CREATE TABLE `__new_cart_item` (
	`added_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`cart_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`variant_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cart_item`("added_at", "cart_id", "id", "quantity", "variant_id", "created_at", "updated_at") SELECT "added_at", "cart_id", "id", "quantity", "variant_id", "created_at", "updated_at" FROM `cart_item`;--> statement-breakpoint
DROP TABLE `cart_item`;--> statement-breakpoint
ALTER TABLE `__new_cart_item` RENAME TO `cart_item`;--> statement-breakpoint
CREATE INDEX `cartItem_cartId_idx` ON `cart_item` (`cart_id`);--> statement-breakpoint
CREATE INDEX `cartItem_variantId_idx` ON `cart_item` (`variant_id`);--> statement-breakpoint
CREATE TABLE `__new_category` (
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text(2048),
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`name` text(255) NOT NULL,
	`parent_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`seo_description` text,
	`seo_title` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_category`("description", "handle", "id", "image", "is_active", "metadata", "name", "parent_id", "position", "seo_description", "seo_title", "created_at", "updated_at") SELECT "description", "handle", "id", "image", "is_active", "metadata", "name", "parent_id", "position", "seo_description", "seo_title", "created_at", "updated_at" FROM `category`;--> statement-breakpoint
DROP TABLE `category`;--> statement-breakpoint
ALTER TABLE `__new_category` RENAME TO `category`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_handle_unique` ON `category` (`handle`);--> statement-breakpoint
CREATE INDEX `category_handle_idx` ON `category` (`handle`);--> statement-breakpoint
CREATE INDEX `category_parentId_idx` ON `category` (`parent_id`);--> statement-breakpoint
CREATE TABLE `__new_checkout` (
	`billing_address_id` text,
	`cart_id` text,
	`customer_note` text,
	`delivery_method_id` text,
	`discount_id` text,
	`email` text(320) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`locker_id` text,
	`shipping_address_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`billing_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`delivery_method_id`) REFERENCES `delivery_method`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`shipping_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_checkout`("billing_address_id", "cart_id", "customer_note", "delivery_method_id", "discount_id", "email", "id", "locker_id", "shipping_address_id", "status", "user_id", "created_at", "updated_at") SELECT "billing_address_id", "cart_id", "customer_note", "delivery_method_id", "discount_id", "email", "id", "locker_id", "shipping_address_id", "status", "user_id", "created_at", "updated_at" FROM `checkout`;--> statement-breakpoint
DROP TABLE `checkout`;--> statement-breakpoint
ALTER TABLE `__new_checkout` RENAME TO `checkout`;--> statement-breakpoint
CREATE INDEX `checkout_cartId_idx` ON `checkout` (`cart_id`);--> statement-breakpoint
CREATE INDEX `checkout_userId_idx` ON `checkout` (`user_id`);--> statement-breakpoint
CREATE INDEX `checkout_status_idx` ON `checkout` (`status`);--> statement-breakpoint
CREATE TABLE `__new_collection` (
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text(2048),
	`metadata` text,
	`seo_description` text,
	`seo_title` text,
	`title` text(255) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_collection`("handle", "id", "image", "metadata", "seo_description", "seo_title", "title", "created_at", "updated_at") SELECT "handle", "id", "image", "metadata", "seo_description", "seo_title", "title", "created_at", "updated_at" FROM `collection`;--> statement-breakpoint
DROP TABLE `collection`;--> statement-breakpoint
ALTER TABLE `__new_collection` RENAME TO `collection`;--> statement-breakpoint
CREATE UNIQUE INDEX `collection_handle_unique` ON `collection` (`handle`);--> statement-breakpoint
CREATE INDEX `collection_handle_idx` ON `collection` (`handle`);--> statement-breakpoint
CREATE TABLE `__new_courier` (
	`id` text PRIMARY KEY NOT NULL,
	`internal_code` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`logo` text(2048),
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_courier`("id", "internal_code", "is_active", "logo", "name", "created_at", "updated_at") SELECT "id", "internal_code", "is_active", "logo", "name", "created_at", "updated_at" FROM `courier`;--> statement-breakpoint
DROP TABLE `courier`;--> statement-breakpoint
ALTER TABLE `__new_courier` RENAME TO `courier`;--> statement-breakpoint
CREATE UNIQUE INDEX `courier_internal_code_unique` ON `courier` (`internal_code`);--> statement-breakpoint
CREATE TABLE `__new_delivery_method` (
	`api_service_code` text NOT NULL,
	`courier_id` text NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`courier_id`) REFERENCES `courier`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_delivery_method`("api_service_code", "courier_id", "description", "id", "is_active", "name", "price", "type", "created_at", "updated_at") SELECT "api_service_code", "courier_id", "description", "id", "is_active", "name", "price", "type", "created_at", "updated_at" FROM `delivery_method`;--> statement-breakpoint
DROP TABLE `delivery_method`;--> statement-breakpoint
ALTER TABLE `__new_delivery_method` RENAME TO `delivery_method`;--> statement-breakpoint
CREATE TABLE `__new_discount` (
	`code` text NOT NULL,
	`ends_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`type` text NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`usage_limit` integer,
	`value` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_discount`("code", "ends_at", "id", "is_active", "starts_at", "type", "usage_count", "usage_limit", "value", "created_at", "updated_at") SELECT "code", "ends_at", "id", "is_active", "starts_at", "type", "usage_count", "usage_limit", "value", "created_at", "updated_at" FROM `discount`;--> statement-breakpoint
DROP TABLE `discount`;--> statement-breakpoint
ALTER TABLE `__new_discount` RENAME TO `discount`;--> statement-breakpoint
CREATE UNIQUE INDEX `discount_code_unique` ON `discount` (`code`);--> statement-breakpoint
CREATE INDEX `discount_code_idx` ON `discount` (`code`);--> statement-breakpoint
CREATE TABLE `__new_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`quantity_available` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`variant_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_inventory`("id", "quantity_available", "quantity_reserved", "variant_id", "version", "created_at", "updated_at") SELECT "id", "quantity_available", "quantity_reserved", "variant_id", "version", "created_at", "updated_at" FROM `inventory`;--> statement-breakpoint
DROP TABLE `inventory`;--> statement-breakpoint
ALTER TABLE `__new_inventory` RENAME TO `inventory`;--> statement-breakpoint
CREATE INDEX `inventory_variantId_idx` ON `inventory` (`variant_id`);--> statement-breakpoint
CREATE TABLE `__new_order` (
	`canceled_at` integer,
	`checkout_id` text,
	`currency_code` text(3) DEFAULT 'PLN' NOT NULL,
	`customer_note` text,
	`delivered_at` integer,
	`delivery_method_id` text,
	`discount_id` text,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`email` text(320) NOT NULL,
	`fulfillment_status` text DEFAULT 'not_fulfilled' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`locker_id` text,
	`metadata` text,
	`payment_id` text,
	`shipped_at` integer,
	`shipping_total` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`tracking_number` text,
	`tracking_url` text(2048),
	`user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkout`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`delivery_method_id`) REFERENCES `delivery_method`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_order`("canceled_at", "checkout_id", "currency_code", "customer_note", "delivered_at", "delivery_method_id", "discount_id", "discount_total", "email", "fulfillment_status", "id", "locker_id", "metadata", "payment_id", "shipped_at", "shipping_total", "status", "subtotal", "tax_total", "total", "tracking_number", "tracking_url", "user_id", "created_at", "updated_at") SELECT "canceled_at", "checkout_id", "currency_code", "customer_note", "delivered_at", "delivery_method_id", "discount_id", "discount_total", "email", "fulfillment_status", "id", "locker_id", "metadata", "payment_id", "shipped_at", "shipping_total", "status", "subtotal", "tax_total", "total", "tracking_number", "tracking_url", "user_id", "created_at", "updated_at" FROM `order`;--> statement-breakpoint
DROP TABLE `order`;--> statement-breakpoint
ALTER TABLE `__new_order` RENAME TO `order`;--> statement-breakpoint
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
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_order_address`("address1", "address2", "city", "country_code", "first_name", "id", "last_name", "order_id", "phone", "postal_code", "province", "type", "created_at", "updated_at") SELECT "address1", "address2", "city", "country_code", "first_name", "id", "last_name", "order_id", "phone", "postal_code", "province", "type", "created_at", "updated_at" FROM `order_address`;--> statement-breakpoint
DROP TABLE `order_address`;--> statement-breakpoint
ALTER TABLE `__new_order_address` RENAME TO `order_address`;--> statement-breakpoint
CREATE INDEX `order_address_orderId_idx` ON `order_address` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_address_type_idx` ON `order_address` (`type`);--> statement-breakpoint
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
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_order_item`("id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title", "created_at", "updated_at") SELECT "id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title", "created_at", "updated_at" FROM `order_item`;--> statement-breakpoint
DROP TABLE `order_item`;--> statement-breakpoint
ALTER TABLE `__new_order_item` RENAME TO `order_item`;--> statement-breakpoint
CREATE INDEX `order_item_orderId_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE TABLE `__new_payment` (
	`amount` integer NOT NULL,
	`checkout_id` text NOT NULL,
	`currency` text(3) DEFAULT 'PLN' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`refunded_amount` integer DEFAULT 0 NOT NULL,
	`refunded_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_payment`("amount", "checkout_id", "currency", "id", "provider", "refunded_amount", "refunded_at", "status", "transaction_id", "created_at", "updated_at") SELECT "amount", "checkout_id", "currency", "id", "provider", "refunded_amount", "refunded_at", "status", "transaction_id", "created_at", "updated_at" FROM `payment`;--> statement-breakpoint
DROP TABLE `payment`;--> statement-breakpoint
ALTER TABLE `__new_payment` RENAME TO `payment`;--> statement-breakpoint
CREATE INDEX `payment_checkoutId_idx` ON `payment` (`checkout_id`);--> statement-breakpoint
CREATE INDEX `payment_transactionId_idx` ON `payment` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `__new_product` (
	`category_id` text,
	`collection_id` text,
	`description` text,
	`handle` text(255) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`images` text,
	`metadata` text,
	`seo_description` text,
	`seo_title` text,
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
--> statement-breakpoint
INSERT INTO `__new_product`("category_id", "collection_id", "description", "handle", "id", "images", "metadata", "seo_description", "seo_title", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at") SELECT "category_id", "collection_id", "description", "handle", "id", "images", "metadata", "seo_description", "seo_title", "status", "subtitle", "tags", "thumbnail", "title", "weight", "created_at", "updated_at" FROM `product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
ALTER TABLE `__new_product` RENAME TO `product`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_handle_unique` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_handle_idx` ON `product` (`handle`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `product_categoryId_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_collectionId_idx` ON `product` (`collection_id`);--> statement-breakpoint
CREATE TABLE `__new_product_option` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_product_option`("id", "product_id", "title", "created_at", "updated_at") SELECT "id", "product_id", "title", "created_at", "updated_at" FROM `product_option`;--> statement-breakpoint
DROP TABLE `product_option`;--> statement-breakpoint
ALTER TABLE `__new_product_option` RENAME TO `product_option`;--> statement-breakpoint
CREATE INDEX `product_option_productId_idx` ON `product_option` (`product_id`);--> statement-breakpoint
CREATE TABLE `__new_product_option_value` (
	`id` text PRIMARY KEY NOT NULL,
	`option_id` text NOT NULL,
	`value` text NOT NULL,
	`variant_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_product_option_value`("id", "option_id", "value", "variant_id", "created_at", "updated_at") SELECT "id", "option_id", "value", "variant_id", "created_at", "updated_at" FROM `product_option_value`;--> statement-breakpoint
DROP TABLE `product_option_value`;--> statement-breakpoint
ALTER TABLE `__new_product_option_value` RENAME TO `product_option_value`;--> statement-breakpoint
CREATE INDEX `product_option_value_optionId_idx` ON `product_option_value` (`option_id`);--> statement-breakpoint
CREATE INDEX `product_option_value_variantId_idx` ON `product_option_value` (`variant_id`);--> statement-breakpoint
CREATE TABLE `__new_product_variant` (
	`barcode` text(255),
	`compare_at_price` integer,
	`id` text PRIMARY KEY NOT NULL,
	`manage_inventory` integer DEFAULT true NOT NULL,
	`metadata` text,
	`price` integer DEFAULT 0 NOT NULL,
	`product_id` text NOT NULL,
	`sku` text(255),
	`title` text(512) NOT NULL,
	`weight` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_product_variant`("barcode", "compare_at_price", "id", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "weight", "created_at", "updated_at") SELECT "barcode", "compare_at_price", "id", "manage_inventory", "metadata", "price", "product_id", "sku", "title", "weight", "created_at", "updated_at" FROM `product_variant`;--> statement-breakpoint
DROP TABLE `product_variant`;--> statement-breakpoint
ALTER TABLE `__new_product_variant` RENAME TO `product_variant`;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variant_productId_idx` ON `product_variant` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_variant_sku_idx` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE TABLE `__new_session` (
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`impersonated_by` text,
	`ip_address` text(45),
	`token` text(16384) NOT NULL,
	`user_agent` text(4096),
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("expires_at", "id", "impersonated_by", "ip_address", "token", "user_agent", "user_id", "created_at", "updated_at") SELECT "expires_at", "id", "impersonated_by", "ip_address", "token", "user_agent", "user_id", "created_at", "updated_at" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_two_factor` (
	`backup_codes` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`user_id` text NOT NULL,
	`verified` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_two_factor`("backup_codes", "id", "secret", "user_id", "verified", "created_at", "updated_at") SELECT "backup_codes", "id", "secret", "user_id", "verified", "created_at", "updated_at" FROM `two_factor`;--> statement-breakpoint
DROP TABLE `two_factor`;--> statement-breakpoint
ALTER TABLE `__new_two_factor` RENAME TO `two_factor`;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`ban_expires` integer,
	`ban_reason` text,
	`banned` integer DEFAULT false,
	`email` text(320) NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text(2048),
	`is_anonymous` integer DEFAULT false,
	`metadata` text,
	`name` text(256) NOT NULL,
	`phone` text(32),
	`role` text,
	`stripe_customer_id` text,
	`timezone` text(64),
	`two_factor_enabled` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("ban_expires", "ban_reason", "banned", "email", "email_verified", "id", "image", "is_anonymous", "metadata", "name", "phone", "role", "stripe_customer_id", "timezone", "two_factor_enabled", "created_at", "updated_at") SELECT "ban_expires", "ban_reason", "banned", "email", "email_verified", "id", "image", "is_anonymous", "metadata", "name", "phone", "role", "stripe_customer_id", "timezone", "two_factor_enabled", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `__new_verification` (
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text(512) NOT NULL,
	`value` text(8192) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_verification`("expires_at", "id", "identifier", "value", "created_at", "updated_at") SELECT "expires_at", "id", "identifier", "value", "created_at", "updated_at" FROM `verification`;--> statement-breakpoint
DROP TABLE `verification`;--> statement-breakpoint
ALTER TABLE `__new_verification` RENAME TO `verification`;--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);