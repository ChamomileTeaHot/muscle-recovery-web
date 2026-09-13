CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`exercise` text NOT NULL,
	`reps` integer NOT NULL,
	`stretched` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workouts_user_date` ON `workouts` (`user_id`,`date`);