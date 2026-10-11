ALTER TABLE `checkout` ADD `locker_unconfirmed` integer DEFAULT false NOT NULL;
ALTER TABLE `order` ADD `locker_unconfirmed` integer DEFAULT false NOT NULL;
