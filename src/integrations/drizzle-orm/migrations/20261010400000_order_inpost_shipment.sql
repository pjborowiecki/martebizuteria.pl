ALTER TABLE `order` ADD `inpost_shipment_id` text;
--> statement-breakpoint
ALTER TABLE `order` ADD `inpost_shipment_status` text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `order_inpostShipmentId_unique` ON `order` (`inpost_shipment_id`);
