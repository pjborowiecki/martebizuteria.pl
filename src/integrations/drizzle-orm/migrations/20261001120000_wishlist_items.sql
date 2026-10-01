CREATE TABLE IF NOT EXISTS `wishlist_item` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL REFERENCES `product`(`id`) ON DELETE cascade,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `wishlist_item_userId_productId_unique` ON `wishlist_item` (`user_id`,`product_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wishlist_item_userId_createdAt_idx` ON `wishlist_item` (`user_id`,`created_at`);
