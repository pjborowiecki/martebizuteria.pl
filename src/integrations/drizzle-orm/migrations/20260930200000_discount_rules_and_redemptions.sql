ALTER TABLE `discount` ADD `description` text;--> statement-breakpoint
ALTER TABLE `discount` ADD `min_order_total` integer;--> statement-breakpoint
ALTER TABLE `discount` ADD `max_discount_amount` integer;--> statement-breakpoint
ALTER TABLE `discount` ADD `per_customer_limit` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discount_isActive_idx` ON `discount` (`is_active`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `discount_redemption` (
  `id` text PRIMARY KEY NOT NULL,
  `discount_id` text NOT NULL REFERENCES `discount`(`id`) ON DELETE cascade,
  `order_id` text REFERENCES `order`(`id`) ON DELETE cascade,
  `user_id` text REFERENCES `user`(`id`) ON DELETE set null,
  `email` text(320) NOT NULL,
  `amount` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discount_redemption_discountId_idx` ON `discount_redemption` (`discount_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discount_redemption_discountId_email_idx` ON `discount_redemption` (`discount_id`,`email`);
--> statement-breakpoint
-- One redemption per order, so a replayed webhook cannot spend a code twice.
CREATE UNIQUE INDEX IF NOT EXISTS `discount_redemption_orderId_unique` ON `discount_redemption` (`order_id`);
