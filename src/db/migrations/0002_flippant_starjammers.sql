ALTER TABLE `delegations` ADD CONSTRAINT `delegations_item_user_unique` UNIQUE(`item_id`,`user_id`);--> statement-breakpoint
ALTER TABLE `delegations` ADD CONSTRAINT `delegations_item_group_unique` UNIQUE(`item_id`,`group_id`);--> statement-breakpoint
ALTER TABLE `delegations` ADD CONSTRAINT `delegations_exactly_one_target` CHECK ((`delegations`.`user_id` IS NULL) <> (`delegations`.`group_id` IS NULL));
