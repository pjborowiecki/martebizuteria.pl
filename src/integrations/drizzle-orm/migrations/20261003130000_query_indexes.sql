DROP INDEX IF EXISTS `audit_log_resource_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `audit_log_action_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_log_resourceId_action_createdAt_idx` ON `audit_log` (`resource_id`,`action`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `audit_log_action_createdAt_idx` ON `audit_log` (`action`,`created_at`);
--> statement-breakpoint
DROP INDEX IF EXISTS `order_userId_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_paymentId_idx` ON `order` (`payment_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_deliveryMethodId_idx` ON `order` (`delivery_method_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `order_item_variantId_idx` ON `order_item` (`variant_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `checkout_shippingAddressId_idx` ON `checkout` (`shipping_address_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `checkout_billingAddressId_idx` ON `checkout` (`billing_address_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `checkout_deliveryMethodId_idx` ON `checkout` (`delivery_method_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `delivery_method_courierId_idx` ON `delivery_method` (`courier_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `wishlist_item_productId_idx` ON `wishlist_item` (`product_id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `attribute_on_product_productId_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `attribute_on_product_attributeId_idx` ON `attribute_on_product` (`attribute_id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `inventory_variantId_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `discount_redemption_discountId_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `discount_redemption_userId_idx` ON `discount_redemption` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_createdAt_idx` ON `newsletter_subscriber` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_subscriber_userId_idx` ON `newsletter_subscriber` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `two_factor_userId_idx` ON `two_factor` (`user_id`);
