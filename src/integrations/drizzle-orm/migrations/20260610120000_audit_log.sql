CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`target` text NOT NULL,
	`detail` text,
	`ip` text,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_createdAt_idx` ON `audit_log` (`created_at`);
--> statement-breakpoint
CREATE INDEX `audit_log_category_idx` ON `audit_log` (`category`);
--> statement-breakpoint
CREATE INDEX `audit_log_severity_idx` ON `audit_log` (`severity`);
--> statement-breakpoint
CREATE INDEX `audit_log_action_idx` ON `audit_log` (`action`);
