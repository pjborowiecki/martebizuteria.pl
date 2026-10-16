INSERT INTO `audit_log` (`id`, `action`, `actor_id`, `actor_name`, `actor_role`, `category`, `created_at`, `metadata`, `resource_id`, `severity`, `target`)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  'customer.orders_claimed',
  NULL,
  'System',
  'system',
  'customers',
  unixepoch() * 1000,
  json_object('orderCount', count(*), 'orderIds', json_group_array(`claim`.`order_id`)),
  `claim`.`user_id`,
  'info',
  `claim`.`email`
FROM (
  SELECT
    `order`.`id` AS `order_id`,
    lower(`order`.`email`) AS `email`,
    (
      SELECT `user`.`id` FROM `user`
      WHERE `user`.`email_verified` = 1 AND lower(trim(`user`.`email`)) = lower(`order`.`email`)
      ORDER BY `user`.`created_at`, `user`.`id`
      LIMIT 1
    ) AS `user_id`
  FROM `order`
  WHERE `order`.`user_id` IS NULL
) AS `claim`
WHERE `claim`.`user_id` IS NOT NULL
GROUP BY `claim`.`user_id`, `claim`.`email`;
--> statement-breakpoint
UPDATE `order`
SET
  `user_id` = (
    SELECT `user`.`id` FROM `user`
    WHERE `user`.`email_verified` = 1 AND lower(trim(`user`.`email`)) = lower(`order`.`email`)
    ORDER BY `user`.`created_at`, `user`.`id`
    LIMIT 1
  ),
  `updated_at` = unixepoch() * 1000
WHERE `user_id` IS NULL
  AND EXISTS (
    SELECT 1 FROM `user`
    WHERE `user`.`email_verified` = 1 AND lower(trim(`user`.`email`)) = lower(`order`.`email`)
  );
