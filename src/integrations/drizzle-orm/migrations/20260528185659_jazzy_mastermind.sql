CREATE TABLE `courier` (
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`internal_code` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courier_internal_code_unique` ON `courier` (`internal_code`);--> statement-breakpoint
ALTER TABLE `delivery_method` ADD `api_service_code` text NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_method` ADD `courier_id` text NOT NULL REFERENCES courier(id);--> statement-breakpoint
ALTER TABLE `delivery_method` DROP COLUMN `provider`;