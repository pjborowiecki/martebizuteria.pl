ALTER TABLE `store_setting` ADD `seller_legal_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_street` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_postal_code` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_city` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_country_code` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_nip` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_regon` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_email` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_phone` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `store_setting` ADD `seller_updated_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `store_setting`
SET
  `seller_legal_name` = 'Pyciak Mariusz Firma Jubilerska',
  `seller_street` = 'ul. Wąska 11',
  `seller_postal_code` = '32-700',
  `seller_city` = 'Bochnia',
  `seller_country_code` = 'PL',
  `seller_nip` = '8681772646',
  `seller_regon` = '384616568',
  `seller_email` = 'kontakt@martebizuteria.pl',
  `seller_phone` = '+48 663 150 820',
  `seller_updated_at` = `updated_at`
WHERE `id` = 'store';
