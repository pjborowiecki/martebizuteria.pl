CREATE TABLE `__new_inventory` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`quantity_available` integer DEFAULT 0 NOT NULL,
	`quantity_reserved` integer DEFAULT 0 NOT NULL,
	`variant_id` text(36) NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `inventory_quantity_available_non_negative` CHECK(`quantity_available` >= 0)
);
INSERT INTO `__new_inventory`(`id`, `quantity_available`, `quantity_reserved`, `variant_id`, `version`, `created_at`, `updated_at`) SELECT `id`, `quantity_available`, `quantity_reserved`, `variant_id`, `version`, `created_at`, `updated_at` FROM `inventory`;
DROP TABLE `inventory`;
ALTER TABLE `__new_inventory` RENAME TO `inventory`;
CREATE UNIQUE INDEX `inventory_variantId_unique` ON `inventory` (`variant_id`);
