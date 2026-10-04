DROP INDEX IF EXISTS `product_variant_sku_idx`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `product_variant_upperSku_idx` ON `product_variant` (upper(`sku`));
