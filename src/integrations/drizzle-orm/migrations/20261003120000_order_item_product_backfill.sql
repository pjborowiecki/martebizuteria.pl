UPDATE `order_item`
SET `product_id` = (SELECT `product_variant`.`product_id` FROM `product_variant` WHERE `product_variant`.`id` = `order_item`.`variant_id`)
WHERE `product_id` IS NULL AND `variant_id` IS NOT NULL;
