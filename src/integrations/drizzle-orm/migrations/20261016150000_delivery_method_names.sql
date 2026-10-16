ALTER TABLE `delivery_method` ADD `names` text DEFAULT '{"pl-PL":"","en-US":""}' NOT NULL;
--> statement-breakpoint
UPDATE `delivery_method`
SET
  `names` = json_object(
    'pl-PL',
    `name`,
    'en-US',
    CASE `name`
      WHEN 'Paczkomat InPost' THEN 'InPost parcel locker'
      WHEN 'Kurier InPost' THEN 'InPost courier'
      WHEN 'Odbiór w atelier' THEN 'Pickup at the atelier'
      ELSE `name`
    END
  );
