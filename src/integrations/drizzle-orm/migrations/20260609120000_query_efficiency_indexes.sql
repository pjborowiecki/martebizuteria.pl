CREATE INDEX IF NOT EXISTS `user_createdAt_idx` ON `user` (`created_at`);
CREATE INDEX IF NOT EXISTS `order_userId_status_idx` ON `order` (`user_id`, `status`);
CREATE INDEX IF NOT EXISTS `address_userId_isDefault_idx` ON `address` (`user_id`, `is_default`);
