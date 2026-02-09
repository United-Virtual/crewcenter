CREATE TABLE `flight_time_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`minutes` integer NOT NULL,
	`category` text NOT NULL,
	`source_type` text NOT NULL,
	`pirep_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pirep_id`) REFERENCES `pireps`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `flight_time_ledger_user_id_index` ON `flight_time_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `flight_time_ledger_user_category_index` ON `flight_time_ledger` (`user_id`,`category`);--> statement-breakpoint
CREATE INDEX `flight_time_ledger_pirep_id_index` ON `flight_time_ledger` (`pirep_id`);--> statement-breakpoint
DROP TABLE `user_type_ratings`;--> statement-breakpoint
ALTER TABLE `airline` ADD `type_rating_change_divisor` real NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `type_rating_id` text REFERENCES type_ratings(id);