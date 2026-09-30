CREATE UNIQUE INDEX `order_checkoutId_unique` ON `order` (`checkout_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_transactionId_unique` ON `payment` (`transaction_id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `payment_transactionId_idx`;
