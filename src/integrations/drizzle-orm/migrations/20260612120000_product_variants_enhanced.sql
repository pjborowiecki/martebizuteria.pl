-- Localized option axes/values, per-variant images and attributes.
PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_product_option` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`titles` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_option` (`id`, `product_id`, `titles`, `created_at`, `updated_at`)
SELECT
	`id`,
	`product_id`,
	json_object('pl', `title`, 'en', `title`),
	`created_at`,
	`updated_at`
FROM `product_option`;

DROP TABLE `product_option`;
ALTER TABLE `__new_product_option` RENAME TO `product_option`;
CREATE INDEX IF NOT EXISTS `product_option_productId_idx` ON `product_option` (`product_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_product_title_pl_unique` ON `product_option` (`product_id`, json_extract(`titles`, '$.pl'));

CREATE TABLE `product_option_value` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`option_id` text(36) NOT NULL,
	`labels` text NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `product_option_value_optionId_idx` ON `product_option_value` (`option_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_option_value_option_label_pl_unique` ON `product_option_value` (`option_id`, json_extract(`labels`, '$.pl'));

INSERT INTO `product_option_value` (`id`, `option_id`, `labels`, `rank`, `created_at`, `updated_at`)
SELECT
	substr(lower(hex(`option_id` || '|' || `value`)), 1, 8) || '-' ||
	substr(lower(hex(`option_id` || '|' || `value`)), 9, 4) || '-' ||
	'4' || substr(lower(hex(`option_id` || '|' || `value`)), 14, 3) || '-' ||
	substr('89ab', (abs(length(`value`)) % 4) + 1, 1) || substr(lower(hex(`option_id` || `value`)), 18, 3) || '-' ||
	substr(lower(hex(`option_id` || '|' || `value` || '|seed')), 1, 12),
	`option_id`,
	json_object('pl', `value`, 'en', `value`),
	`rank`,
	`created_at`,
	`updated_at`
FROM (
	SELECT
		`option_id`,
		`value`,
		row_number() OVER (PARTITION BY `option_id` ORDER BY `value`) - 1 AS `rank`,
		min(`created_at`) AS `created_at`,
		min(`updated_at`) AS `updated_at`
	FROM `option_on_variant`
	GROUP BY `option_id`, `value`
);

CREATE TABLE `__new_option_on_variant` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`option_id` text(36) NOT NULL,
	`value_id` text(36) NOT NULL,
	`variant_id` text(36) NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_option`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`value_id`) REFERENCES `product_option_value`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_option_on_variant` (`id`, `option_id`, `value_id`, `variant_id`, `created_at`, `updated_at`)
SELECT
	`oov`.`id`,
	`oov`.`option_id`,
	`pov`.`id`,
	`oov`.`variant_id`,
	`oov`.`created_at`,
	`oov`.`updated_at`
FROM `option_on_variant` AS `oov`
INNER JOIN `product_option_value` AS `pov`
	ON `pov`.`option_id` = `oov`.`option_id`
	AND json_extract(`pov`.`labels`, '$.pl') = `oov`.`value`;

DROP TABLE `option_on_variant`;
ALTER TABLE `__new_option_on_variant` RENAME TO `option_on_variant`;
CREATE INDEX IF NOT EXISTS `option_on_variant_optionId_idx` ON `option_on_variant` (`option_id`);
CREATE INDEX IF NOT EXISTS `option_on_variant_valueId_idx` ON `option_on_variant` (`value_id`);
CREATE INDEX IF NOT EXISTS `option_on_variant_variantId_idx` ON `option_on_variant` (`variant_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `option_on_variant_variant_option_unique` ON `option_on_variant` (`variant_id`, `option_id`);

CREATE TABLE `__new_product_image` (
	`alt` text(512),
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`url` text(2048) NOT NULL,
	`variant_id` text(36),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_product_image` (`alt`, `id`, `product_id`, `rank`, `url`, `variant_id`, `created_at`, `updated_at`)
SELECT `alt`, `id`, `product_id`, `rank`, `url`, NULL, `created_at`, `updated_at`
FROM `product_image`;

DROP TABLE `product_image`;
ALTER TABLE `__new_product_image` RENAME TO `product_image`;
CREATE INDEX IF NOT EXISTS `product_image_productId_rank_idx` ON `product_image` (`product_id`, `rank`);
CREATE INDEX IF NOT EXISTS `product_image_variantId_rank_idx` ON `product_image` (`variant_id`, `rank`);

CREATE TABLE `__new_attribute_on_product` (
	`attribute_id` text(36) NOT NULL,
	`id` text(36) PRIMARY KEY NOT NULL,
	`product_id` text(36) NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`value` text(4096) NOT NULL,
	`variant_id` text(36),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`attribute_id`) REFERENCES `product_attribute`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_attribute_on_product` (`attribute_id`, `id`, `product_id`, `rank`, `value`, `variant_id`, `created_at`, `updated_at`)
SELECT `attribute_id`, `id`, `product_id`, `rank`, `value`, NULL, `created_at`, `updated_at`
FROM `attribute_on_product`;

DROP TABLE `attribute_on_product`;
ALTER TABLE `__new_attribute_on_product` RENAME TO `attribute_on_product`;
CREATE INDEX IF NOT EXISTS `attribute_on_product_productId_idx` ON `attribute_on_product` (`product_id`);
CREATE INDEX IF NOT EXISTS `attribute_on_product_variantId_idx` ON `attribute_on_product` (`variant_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `attribute_on_product_scope_attribute_uidx` ON `attribute_on_product` (`product_id`, `attribute_id`, coalesce(`variant_id`, ''));

PRAGMA foreign_keys=ON;
