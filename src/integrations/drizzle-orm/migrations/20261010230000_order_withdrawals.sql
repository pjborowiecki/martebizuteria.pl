CREATE TABLE IF NOT EXISTS `order_withdrawal` (
  `consumer_name` text(256) NOT NULL,
  `email` text(320) NOT NULL,
  `id` text PRIMARY KEY NOT NULL,
  `items` text,
  `order_id` text NOT NULL REFERENCES `order`(`id`) ON DELETE cascade,
  `reason` text,
  `scope` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_withdrawal_orderId_idx` ON `order_withdrawal` (`order_id`);
