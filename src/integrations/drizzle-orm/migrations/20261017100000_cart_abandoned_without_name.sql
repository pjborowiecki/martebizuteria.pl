UPDATE `audit_log`
SET `detail` = NULL
WHERE `action` = 'customer.cart_abandoned'
  AND `detail` = `actor_name`;
