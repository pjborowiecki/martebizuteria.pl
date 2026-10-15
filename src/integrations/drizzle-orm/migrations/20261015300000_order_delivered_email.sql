ALTER TABLE `order` ADD `delivered_email_at` integer;
--> statement-breakpoint
UPDATE `order` SET `delivered_email_at` = coalesce(`delivered_at`, `updated_at`) WHERE `fulfillment_status` = 'delivered';
