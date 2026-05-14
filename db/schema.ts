import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  json,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const journalUsers = pgTable("journal_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  birthDate: text("birth_date"),
  timezone: text("timezone").notNull().default("UTC"),
  lifePath: integer("life_path"),
  soulUrge: integer("soul_urge"),
  expression: integer("expression"),
  sunSign: text("sun_sign"),
  moonSign: text("moon_sign"),
  risingSign: text("rising_sign"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => journalUsers.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    mood: integer("mood"),
    energy: integer("energy"),
    tags: json("tags").$type<string[]>().default([]),
    entryDate: text("entry_date").notNull(),
    numerologyDay: integer("numerology_day"),
    moonPhase: text("moon_phase"),
    syncedAt: timestamp("synced_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("journal_entries_user_idx").on(t.userId),
    dateIdx: index("journal_entries_date_idx").on(t.entryDate),
  })
);

export const journalInsights = pgTable(
  "journal_insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => journalUsers.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => journalEntries.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    numerologyContext: json("numerology_context"),
    astrologyContext: json("astrology_context"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("journal_insights_user_idx").on(t.userId),
  })
);

export const journalPatterns = pgTable(
  "journal_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => journalUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    description: text("description").notNull(),
    frequency: integer("frequency").notNull().default(1),
    lastSeen: text("last_seen").notNull(),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("journal_patterns_user_idx").on(t.userId),
  })
);

export const journalReminders = pgTable(
  "journal_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => journalUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message"),
    cronExpression: text("cron_expression").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    fcmToken: text("fcm_token"),
    lastSentAt: timestamp("last_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("journal_reminders_user_idx").on(t.userId),
  })
);
