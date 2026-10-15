DROP INDEX IF EXISTS `newsletter_subscriber_status_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_status_createdAt_idx` ON `newsletter_subscriber` (`status`,`created_at`);
