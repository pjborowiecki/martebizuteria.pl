ALTER TABLE `delivery_method` ADD `rank` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `delivery_method` ADD `archived_at` integer;
--> statement-breakpoint
UPDATE `delivery_method`
SET
  `rank` = (
    SELECT `ranked`.`rank`
    FROM (
      SELECT
        `id`,
        row_number() OVER (
          ORDER BY
            CASE `type`
              WHEN 'courier' THEN 0
              WHEN 'locker' THEN 1
              ELSE 2
            END,
            `created_at`,
            `id`
        ) - 1 AS `rank`
      FROM `delivery_method`
    ) AS `ranked`
    WHERE `ranked`.`id` = `delivery_method`.`id`
  );
