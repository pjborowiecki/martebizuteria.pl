ALTER TABLE `order` ADD `restocked_at` integer;
UPDATE `order` SET `restocked_at` = coalesce(`canceled_at`, (SELECT `refunded_at` FROM `payment` WHERE `payment`.`id` = `order`.`payment_id`), `updated_at`) WHERE `status` IN ('cancelled', 'refunded');
