CREATE TABLE IF NOT EXISTS `newsletter_subscriber` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text(320) NOT NULL,
  `status` text NOT NULL,
  `source` text NOT NULL,
  `locale` text NOT NULL,
  `token` text NOT NULL,
  `user_id` text REFERENCES `user`(`id`) ON DELETE set null,
  `confirmed_at` integer,
  `unsubscribed_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
-- Emails are stored lower-cased, so one address cannot join twice by casing.
CREATE UNIQUE INDEX IF NOT EXISTS `newsletter_subscriber_email_unique` ON `newsletter_subscriber` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `newsletter_subscriber_token_unique` ON `newsletter_subscriber` (`token`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_status_idx` ON `newsletter_subscriber` (`status`);
