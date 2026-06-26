CREATE TEMPORARY TABLE `group_members_distinct` AS
  SELECT DISTINCT `group_id`, `user_id`
  FROM `group_members`;
--> statement-breakpoint
DELETE FROM `group_members`;
--> statement-breakpoint
INSERT INTO `group_members` (`group_id`, `user_id`)
  SELECT `group_id`, `user_id`
  FROM `group_members_distinct`;
--> statement-breakpoint
DROP TEMPORARY TABLE `group_members_distinct`;
--> statement-breakpoint
ALTER TABLE `group_members`
  ADD CONSTRAINT `group_members_group_id_user_id_pk` PRIMARY KEY(`group_id`, `user_id`);
