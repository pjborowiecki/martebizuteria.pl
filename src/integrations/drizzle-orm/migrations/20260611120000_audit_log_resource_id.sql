ALTER TABLE `audit_log` ADD `resource_id` text;
--> statement-breakpoint
CREATE INDEX `audit_log_resource_idx` ON `audit_log` (`category`, `resource_id`);
