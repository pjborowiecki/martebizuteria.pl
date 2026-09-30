-- Existing orders predate order numbers. Number them by creation order within
-- their calendar year so the series reads chronologically, then seed the
-- sequence so newly placed orders continue from the highest number in use.
UPDATE `order`
SET order_number = (
  SELECT 'MRT-' || strftime('%Y', `order`.created_at / 1000, 'unixepoch') || '-' || printf(
    '%05d',
    (
      SELECT COUNT(*)
      FROM `order` AS earlier
      WHERE strftime('%Y', earlier.created_at / 1000, 'unixepoch') = strftime('%Y', `order`.created_at / 1000, 'unixepoch')
        AND (earlier.created_at < `order`.created_at OR (earlier.created_at = `order`.created_at AND earlier.id <= `order`.id))
    )
  )
)
WHERE order_number IS NULL;
--> statement-breakpoint
INSERT INTO `order_number_sequence` (period, last_value)
SELECT strftime('%Y', created_at / 1000, 'unixepoch'), COUNT(*)
FROM `order`
GROUP BY strftime('%Y', created_at / 1000, 'unixepoch')
ON CONFLICT(period) DO UPDATE SET last_value = MAX(last_value, excluded.last_value);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `order_orderNumber_unique` ON `order` (`order_number`);
