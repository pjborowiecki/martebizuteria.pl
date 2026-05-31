PRAGMA defer_foreign_keys=true;--> statement-breakpoint
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
	`role` text DEFAULT 'customer' NOT NULL,
	`stripe_customer_id` text,
	`timezone` text(64),
	`two_factor_enabled` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("ban_expires", "ban_reason", "banned", "email", "email_verified", "id", "image", "is_anonymous", "metadata", "name", "phone", "role", "stripe_customer_id", "timezone", "two_factor_enabled", "created_at", "updated_at") SELECT "ban_expires", "ban_reason", "banned", "email", "email_verified", "id", "image", "is_anonymous", "metadata", "name", "phone", CASE WHEN "role" = 'admin' THEN 'admin' ELSE 'customer' END, "stripe_customer_id", "timezone", "two_factor_enabled", "created_at", "updated_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);