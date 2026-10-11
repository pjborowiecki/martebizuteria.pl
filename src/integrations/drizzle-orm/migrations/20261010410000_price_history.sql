CREATE TABLE IF NOT EXISTS `price_history` (
  `changed_at` integer NOT NULL,
  `compare_at_price` integer,
  `id` integer PRIMARY KEY NOT NULL,
  `price` integer NOT NULL,
  `variant_id` text(36) NOT NULL REFERENCES `product_variant`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `price_history_variantId_idx` ON `price_history` (`variant_id`);
--> statement-breakpoint
INSERT INTO `price_history` (`changed_at`, `compare_at_price`, `price`, `variant_id`)
SELECT `updated_at`, `compare_at_price`, `price`, `id` FROM `product_variant`;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `price_history_variant_insert` AFTER INSERT ON `product_variant` BEGIN
  INSERT INTO `price_history` (`changed_at`, `compare_at_price`, `price`, `variant_id`)
  VALUES (unixepoch() * 1000, new.`compare_at_price`, new.`price`, new.`id`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `price_history_variant_update` AFTER UPDATE OF `price`, `compare_at_price` ON `product_variant`
WHEN new.`price` IS NOT old.`price` OR new.`compare_at_price` IS NOT old.`compare_at_price` BEGIN
  INSERT INTO `price_history` (`changed_at`, `compare_at_price`, `price`, `variant_id`)
  VALUES (unixepoch() * 1000, new.`compare_at_price`, new.`price`, new.`id`);
END;
