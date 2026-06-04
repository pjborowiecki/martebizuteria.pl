-- rank column + indexes were added by 20260606084825_fuzzy_miek.sql; only backfill ordering here.
UPDATE `product`
SET `rank` = (
  SELECT COUNT(*)
  FROM `product` AS `p2`
  WHERE `p2`.`created_at` < `product`.`created_at`
     OR (`p2`.`created_at` = `product`.`created_at` AND `p2`.`id` < `product`.`id`)
);
