UPDATE `discount_redemption`
SET
  `user_id` = (SELECT `order`.`user_id` FROM `order` WHERE `order`.`id` = `discount_redemption`.`order_id`),
  `updated_at` = unixepoch() * 1000
WHERE EXISTS (
  SELECT 1 FROM `order`
  WHERE `order`.`id` = `discount_redemption`.`order_id`
    AND `order`.`user_id` IS NOT NULL
    AND `order`.`user_id` IS NOT `discount_redemption`.`user_id`
);
