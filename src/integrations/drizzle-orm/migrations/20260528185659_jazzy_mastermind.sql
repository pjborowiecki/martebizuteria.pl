CREATE TABLE `courier` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`internal_code` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);

CREATE UNIQUE INDEX `courier_internal_code_unique` ON `courier` (`internal_code`);
ALTER TABLE `delivery_method` ADD `api_service_code` text NOT NULL;
ALTER TABLE `delivery_method` ADD `courier_id` text NOT NULL REFERENCES courier(id);
ALTER TABLE `delivery_method` DROP COLUMN `provider`;