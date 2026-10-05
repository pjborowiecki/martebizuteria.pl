CREATE TABLE IF NOT EXISTS `discount_claim` (
  `checkout_id` text NOT NULL REFERENCES `checkout`(`id`) ON DELETE cascade,
  `discount_id` text NOT NULL REFERENCES `discount`(`id`) ON DELETE cascade,
  `email` text(320) NOT NULL,
  `id` text PRIMARY KEY NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `discount_claim_checkoutId_discountId_unique` ON `discount_claim` (`checkout_id`,`discount_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discount_claim_discountId_email_idx` ON `discount_claim` (`discount_id`,`email`);
