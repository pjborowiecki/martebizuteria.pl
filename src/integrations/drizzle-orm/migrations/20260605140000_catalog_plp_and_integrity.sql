-- Complements 20260605123024_sparkling_umar (schema columns/indexes already applied there).
UPDATE `product`
SET `primary_category_id` = (
  SELECT `category_id`
  FROM `category_on_product`
  WHERE `category_on_product`.`product_id` = `product`.`id` AND `category_on_product`.`is_primary` = 1
  LIMIT 1
)
WHERE `primary_category_id` IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `category_on_product_one_primary_per_product_uidx` ON `category_on_product` (`product_id`) WHERE `is_primary` = 1;
