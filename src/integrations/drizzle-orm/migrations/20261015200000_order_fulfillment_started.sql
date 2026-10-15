ALTER TABLE `order` ADD `fulfillment_started_at` integer;
--> statement-breakpoint
ALTER TABLE `order` ADD `in_progress_email_at` integer;
--> statement-breakpoint
UPDATE `order` SET `fulfillment_started_at` = coalesce((SELECT min(`audit_log`.`created_at`) FROM `audit_log` WHERE `audit_log`.`resource_id` = `order`.`id` AND `audit_log`.`action` = 'order.fulfillment_started'), `shipped_at`, `delivered_at`, `updated_at`) WHERE `fulfillment_status` IN ('fulfilled', 'shipped', 'delivered');
--> statement-breakpoint
UPDATE `order` SET `in_progress_email_at` = `fulfillment_started_at` WHERE `fulfillment_started_at` IS NOT NULL;
