CREATE TABLE IF NOT EXISTS `user_email_history` (
  `added_at` integer NOT NULL,
  `email` text(320) NOT NULL,
  `id` integer PRIMARY KEY NOT NULL,
  `replaced_at` integer,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_email_history_userId_idx` ON `user_email_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_email_history_email_idx` ON `user_email_history` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_history_current_unique` ON `user_email_history` (`user_id`) WHERE `replaced_at` IS NULL;
--> statement-breakpoint
INSERT INTO `user_email_history` (`added_at`, `email`, `replaced_at`, `user_id`)
SELECT
  coalesce(`change`.`previous_change_at`, `user`.`created_at`),
  `change`.`previous_email`,
  `change`.`changed_at`,
  `change`.`user_id`
FROM (
  SELECT
    `audit_log`.`resource_id` AS `user_id`,
    `audit_log`.`created_at` AS `changed_at`,
    lower(trim(substr(`audit_log`.`detail`, 1, instr(`audit_log`.`detail`, ' → ') - 1))) AS `previous_email`,
    lag(`audit_log`.`created_at`) OVER (
      PARTITION BY `audit_log`.`resource_id`
      ORDER BY `audit_log`.`created_at`, `audit_log`.`id`
    ) AS `previous_change_at`
  FROM `audit_log`
  WHERE `audit_log`.`action` = 'auth.email_changed' AND instr(`audit_log`.`detail`, ' → ') > 1
) AS `change`
INNER JOIN `user` ON `user`.`id` = `change`.`user_id`
WHERE `change`.`changed_at` >= `user`.`created_at`
  AND NOT EXISTS (SELECT 1 FROM `user_email_history` WHERE `user_email_history`.`user_id` = `user`.`id`);
--> statement-breakpoint
INSERT INTO `user_email_history` (`added_at`, `email`, `user_id`)
SELECT
  coalesce((SELECT max(`replaced_at`) FROM `user_email_history` WHERE `user_email_history`.`user_id` = `user`.`id`), `user`.`created_at`),
  lower(`user`.`email`),
  `user`.`id`
FROM `user`
WHERE NOT EXISTS (
  SELECT 1 FROM `user_email_history` WHERE `user_email_history`.`user_id` = `user`.`id` AND `user_email_history`.`replaced_at` IS NULL
);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_email_history_user_insert` AFTER INSERT ON `user` BEGIN
  INSERT INTO `user_email_history` (`added_at`, `email`, `user_id`) VALUES (new.`created_at`, lower(new.`email`), new.`id`);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `user_email_history_user_update` AFTER UPDATE OF `email` ON `user`
WHEN lower(new.`email`) IS NOT lower(old.`email`) BEGIN
  UPDATE `user_email_history`
  SET `replaced_at` = CAST(round((julianday('now') - 2440587.5) * 86400000) AS integer)
  WHERE `user_id` = new.`id` AND `replaced_at` IS NULL;
  INSERT INTO `user_email_history` (`added_at`, `email`, `user_id`)
  VALUES (CAST(round((julianday('now') - 2440587.5) * 86400000) AS integer), lower(new.`email`), new.`id`);
END;
