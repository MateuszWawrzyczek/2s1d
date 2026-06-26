CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`user_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`item_id` int NOT NULL,
	`old_value` json,
	`new_value` json,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borrowings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`borrower_id` int,
	`external_borrower` varchar(160),
	`mode` enum('classic','trusted','asynchronous','external') NOT NULL,
	`status` enum('pending','reserved','borrowed','returned','rejected') NOT NULL DEFAULT 'pending',
	`planned_return_at` datetime,
	`approved_at` datetime,
	`handed_over_at` datetime,
	`returned_at` datetime,
	`return_comment` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `borrowings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`parent_id` int,
	`legacy_type_id` int,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delegations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`user_id` int,
	`group_id` int,
	`permission` enum('manage','edit') NOT NULL,
	CONSTRAINT `delegations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` int NOT NULL,
	`user_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `item_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`uploaded_by_id` int NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`content_type` varchar(120) NOT NULL,
	`storage_path` varchar(500) NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `item_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_system` boolean NOT NULL DEFAULT false,
	`slug` varchar(100),
	`description` varchar(500),
	CONSTRAINT `item_status_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_item_status_name` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`system_id` varchar(32),
	`name` varchar(100) NOT NULL,
	`manufacturer` varchar(100),
	`model` varchar(100),
	`serial` varchar(100),
	`inventory_number` varchar(100),
	`description` text,
	`purchase_date` date,
	`added_at` datetime,
	`category_id` int,
	`status_id` int,
	`location_id` int,
	`owner_id` int,
	`owner_group_id` int,
	`legacy_item_id` int,
	CONSTRAINT `items_id` PRIMARY KEY(`id`),
	CONSTRAINT `items_system_id_unique` UNIQUE(`system_id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`kind` enum('internal','external') NOT NULL DEFAULT 'internal',
	`building` varchar(80),
	`room` varchar(80),
	`cabinet` varchar(80),
	`shelf` varchar(80),
	`map_x` float,
	`map_y` float,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`legacy_room_id` int,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`borrowing_id` int,
	`event_type` enum('return_due','borrowing_approved') NOT NULL,
	`channel` enum('email','push') NOT NULL,
	`payload` varchar(1000) NOT NULL,
	`scheduled_at` datetime NOT NULL,
	`sent_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `notification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`email_enabled` boolean NOT NULL DEFAULT true,
	`push_enabled` boolean NOT NULL DEFAULT false,
	`return_due_notice_hours` int NOT NULL DEFAULT 24,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`hashed_password` varchar(255),
	`google_id` varchar(255),
	`auth_provider` enum('local','google') NOT NULL DEFAULT 'local',
	`is_active` boolean NOT NULL DEFAULT true,
	`is_approved` boolean NOT NULL DEFAULT true,
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `borrowings` ADD CONSTRAINT `borrowings_item_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `borrowings` ADD CONSTRAINT `borrowings_borrower_fk` FOREIGN KEY (`borrower_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_fk` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delegations` ADD CONSTRAINT `delegations_item_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delegations` ADD CONSTRAINT `delegations_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delegations` ADD CONSTRAINT `delegations_group_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_group_fk` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_photos` ADD CONSTRAINT `item_photos_item_fk` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_photos` ADD CONSTRAINT `item_photos_uploader_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_category_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_status_fk` FOREIGN KEY (`status_id`) REFERENCES `item_status`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_location_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_owner_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `items` ADD CONSTRAINT `items_owner_group_fk` FOREIGN KEY (`owner_group_id`) REFERENCES `groups`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `notification_events_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_events` ADD CONSTRAINT `notification_events_borrowing_fk` FOREIGN KEY (`borrowing_id`) REFERENCES `borrowings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `items_system_id_idx` ON `items` (`system_id`);--> statement-breakpoint
CREATE INDEX `items_serial_idx` ON `items` (`serial`);--> statement-breakpoint
CREATE INDEX `items_inv_num_idx` ON `items` (`inventory_number`);--> statement-breakpoint
CREATE INDEX `items_legacy_id_idx` ON `items` (`legacy_item_id`);