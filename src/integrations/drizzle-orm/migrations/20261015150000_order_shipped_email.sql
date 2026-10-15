ALTER TABLE `order` ADD `shipped_email_at` integer;
--> statement-breakpoint
ALTER TABLE `order` ADD `tracking_email_number` text;
--> statement-breakpoint
UPDATE `order` SET `shipped_email_at` = coalesce(`shipped_at`, `delivered_at`, `updated_at`), `tracking_email_number` = `tracking_number` WHERE `fulfillment_status` IN ('shipped', 'delivered');
