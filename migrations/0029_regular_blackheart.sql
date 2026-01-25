CREATE TABLE `type_rating_aircraft` (
	`id` text PRIMARY KEY NOT NULL,
	`type_rating_id` text NOT NULL,
	`aircraft_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`type_rating_id`) REFERENCES `type_ratings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `type_rating_aircraft_type_rating_id_index` ON `type_rating_aircraft` (`type_rating_id`);--> statement-breakpoint
CREATE INDEX `type_rating_aircraft_aircraft_id_index` ON `type_rating_aircraft` (`aircraft_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `type_rating_aircraft_unique` ON `type_rating_aircraft` (`type_rating_id`,`aircraft_id`);--> statement-breakpoint
CREATE TABLE `type_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `type_ratings_name_index` ON `type_ratings` (`name`);--> statement-breakpoint
CREATE TABLE `user_type_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type_rating_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_rating_id`) REFERENCES `type_ratings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_type_ratings_user_id_index` ON `user_type_ratings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_type_ratings_type_rating_id_index` ON `user_type_ratings` (`type_rating_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_type_ratings_unique` ON `user_type_ratings` (`user_id`,`type_rating_id`);