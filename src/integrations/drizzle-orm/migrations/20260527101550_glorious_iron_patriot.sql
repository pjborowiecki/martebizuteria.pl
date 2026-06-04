CREATE TABLE `two_factor` (
	`backup_codes` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`user_id` text NOT NULL,
	`verified` integer DEFAULT true,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

ALTER TABLE `session` ADD `impersonated_by` text;
ALTER TABLE `user` ADD `is_anonymous` integer DEFAULT false;
ALTER TABLE `user` ADD `role` text;
ALTER TABLE `user` ADD `banned` integer DEFAULT false;
ALTER TABLE `user` ADD `ban_reason` text;
ALTER TABLE `user` ADD `ban_expires` text;
ALTER TABLE `user` ADD `two_factor_enabled` integer DEFAULT false;