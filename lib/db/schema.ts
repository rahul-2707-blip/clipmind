import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const meetingStatus = pgEnum("meeting_status", [
  "uploaded",
  "transcribing",
  "extracting",
  "completed",
  "failed",
]);

export const priorityLevel = pgEnum("priority_level", [
  "low",
  "medium",
  "high",
]);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    audioUrl: text("audio_url").notNull(),
    audioKey: text("audio_key").notNull(),
    durationSeconds: integer("duration_seconds"),
    status: meetingStatus("status").notNull().default("uploaded"),
    errorMessage: text("error_message"),
    transcript: text("transcript"),
    summary: text("summary"),
    decisions: jsonb("decisions").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userIdx: index("meetings_user_idx").on(table.userId),
    createdIdx: index("meetings_created_idx").on(table.createdAt),
  })
);

export const actionItems = pgTable(
  "action_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    owner: text("owner"),
    dueDate: text("due_date"),
    priority: priorityLevel("priority").notNull().default("medium"),
    completed: integer("completed").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    meetingIdx: index("action_items_meeting_idx").on(table.meetingId),
  })
);

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type ActionItem = typeof actionItems.$inferSelect;
export type NewActionItem = typeof actionItems.$inferInsert;
