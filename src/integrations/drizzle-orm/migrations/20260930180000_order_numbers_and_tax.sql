CREATE TABLE IF NOT EXISTS `order_number_sequence` (
  `period` text PRIMARY KEY NOT NULL,
  `last_value` integer NOT NULL
);
--> statement-breakpoint
-- SQLite cannot add a NOT NULL column without a default, and a per-row default
-- is exactly what an order number is. The backfill migration that follows fills
-- every existing row and adds the unique index; inserts always supply one.
ALTER TABLE `order` ADD `order_number` text;--> statement-breakpoint
ALTER TABLE `order` ADD `tax_basis_points` integer DEFAULT 2300 NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `billing_company_name` text;--> statement-breakpoint
ALTER TABLE `order` ADD `billing_nip` text;--> statement-breakpoint
ALTER TABLE `checkout` ADD `billing_company_name` text;--> statement-breakpoint
ALTER TABLE `checkout` ADD `billing_nip` text;
