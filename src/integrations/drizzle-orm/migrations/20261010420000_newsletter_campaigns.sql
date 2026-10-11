CREATE TABLE IF NOT EXISTS `newsletter_campaign` (
  `bodies` text NOT NULL,
  `completed_at` integer,
  `failure` text,
  `id` text PRIMARY KEY NOT NULL,
  `last_recipient_id` text,
  `origin` text NOT NULL,
  `recipient_count` integer NOT NULL,
  `sent_count` integer DEFAULT 0 NOT NULL,
  `status` text NOT NULL,
  `subjects` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_campaign_createdAt_idx` ON `newsletter_campaign` (`created_at`);
