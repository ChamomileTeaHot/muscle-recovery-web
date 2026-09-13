import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const workouts = sqliteTable('workouts', {
 id: text('id').primaryKey(), userId: text('user_id').notNull(), date: text('date').notNull(),
 exercise: text('exercise').notNull(), reps: integer('reps').notNull(), stretched: integer('stretched').notNull(),
 createdAt: text('created_at').notNull(),
}, t => [index('idx_workouts_user_date').on(t.userId,t.date)]);
