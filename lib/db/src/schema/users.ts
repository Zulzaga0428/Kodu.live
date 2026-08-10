import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  provider: text("provider").notNull(), // "google" | "github" | "demo"
  providerId: text("provider_id").notNull(),
  credits: integer("credits").notNull().default(20), // шинэ хэрэглэгч 20 кредит авна
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
