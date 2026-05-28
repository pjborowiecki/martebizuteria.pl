ALTER TABLE `cart` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_item` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_item` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_address` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_address` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_item` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `order_item` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `two_factor` ADD `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;--> statement-breakpoint
ALTER TABLE `two_factor` ADD `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL;