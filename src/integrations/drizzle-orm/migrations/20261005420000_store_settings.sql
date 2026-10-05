CREATE TABLE IF NOT EXISTS `store_setting` (
  `id` text PRIMARY KEY NOT NULL,
  `sales_paused` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `store_setting` (`id`) VALUES ('store');
