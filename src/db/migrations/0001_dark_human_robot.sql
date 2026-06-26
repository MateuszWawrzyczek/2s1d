ALTER TABLE `groups` ADD `default_permission` enum('manage','edit') DEFAULT 'edit' NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_events` MODIFY COLUMN `channel` enum('in_app','email','push') NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` MODIFY COLUMN `email_enabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `notification_events_delivery_unique` UNIQUE(`user_id`,`borrowing_id`,`event_type`,`channel`);
