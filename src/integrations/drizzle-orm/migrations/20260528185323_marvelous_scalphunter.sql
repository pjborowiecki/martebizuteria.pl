CREATE TABLE `cart` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`expires_at` text,
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX `cart_userId_idx` ON `cart` (`user_id`);
CREATE INDEX `cart_sessionId_idx` ON `cart` (`session_id`);
CREATE TABLE `cart_item` (
	`added_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cart_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`variant_id` text NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `cartItem_cartId_idx` ON `cart_item` (`cart_id`);
CREATE INDEX `cartItem_variantId_idx` ON `cart_item` (`variant_id`);
CREATE TABLE `checkout` (
	`billing_address_id` text,
	`cart_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`delivery_method_id` text,
	`email` text(320) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`locker_id` text,
	`shipping_address_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`billing_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cart_id`) REFERENCES `cart`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`delivery_method_id`) REFERENCES `delivery_method`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`shipping_address_id`) REFERENCES `address`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX `checkout_cartId_idx` ON `checkout` (`cart_id`);
CREATE INDEX `checkout_userId_idx` ON `checkout` (`user_id`);
CREATE INDEX `checkout_status_idx` ON `checkout` (`status`);
CREATE TABLE `delivery_method` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`description` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`provider` text,
	`type` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`quantity_available` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`variant_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `inventory_variantId_idx` ON `inventory` (`variant_id`);
CREATE TABLE `payment` (
	`amount` integer NOT NULL,
	`checkout_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`currency` text(3) DEFAULT 'PLN' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkout`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `payment_checkoutId_idx` ON `payment` (`checkout_id`);
CREATE INDEX `payment_transactionId_idx` ON `payment` (`transaction_id`);
ALTER TABLE `order` ADD `checkout_id` text REFERENCES checkout(id);
ALTER TABLE `order` ADD `delivery_method_id` text REFERENCES delivery_method(id);
ALTER TABLE `order` ADD `locker_id` text;
ALTER TABLE `order` ADD `payment_id` text REFERENCES payment(id);
ALTER TABLE `order` DROP COLUMN `payment_status`;
PRAGMA foreign_keys=OFF;
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
	FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_order_item`("id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title") SELECT "id", "metadata", "order_id", "product_id", "quantity", "subtotal", "thumbnail", "title", "total", "unit_price", "variant_id", "variant_title" FROM `order_item`;
DROP TABLE `order_item`;
ALTER TABLE `__new_order_item` RENAME TO `order_item`;
PRAGMA foreign_keys=ON;
CREATE INDEX `order_item_orderId_idx` ON `order_item` (`order_id`);
ALTER TABLE `product_variant` DROP COLUMN `allow_backorder`;
ALTER TABLE `product_variant` DROP COLUMN `inventory_quantity`;