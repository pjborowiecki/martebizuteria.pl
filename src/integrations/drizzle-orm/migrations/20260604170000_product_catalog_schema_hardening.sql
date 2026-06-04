-- Product catalog integrity: one inventory row per variant, one option value per (variant, option), unique option title per product.
CREATE UNIQUE INDEX IF NOT EXISTS `inventory_variantId_unique` ON `inventory` (`variant_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_value_variant_option_unique` ON `product_option_value` (`variant_id`,`option_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_product_title_unique` ON `product_option` (`product_id`,`title`);
