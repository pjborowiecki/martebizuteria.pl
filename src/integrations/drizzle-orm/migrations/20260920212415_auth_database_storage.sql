CREATE TABLE `rate_limit` (
	`count` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`last_request` integer NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);
--> statement-breakpoint
CREATE INDEX `rate_limit_last_request_idx` ON `rate_limit` (`last_request`);
--> statement-breakpoint
ALTER TABLE `two_factor` ADD `failed_verification_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `two_factor` ADD `locked_until` integer;
