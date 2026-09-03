import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()::text`);

export const usersTable = pgTable(
  "baynatna_users",
  {
    id: id(),
    clerkId: text("clerk_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("baynatna_users_clerk_id_idx").on(table.clerkId)],
);

export const groupsTable = pgTable(
  "baynatna_groups",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    inviteCode: text("invite_code").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("baynatna_groups_invite_code_idx").on(table.inviteCode),
    index("baynatna_groups_created_by_idx").on(table.createdBy),
  ],
);

export const groupMembersTable = pgTable(
  "baynatna_group_members",
  {
    id: id(),
    groupId: text("group_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("baynatna_group_members_unique_idx").on(
      table.groupId,
      table.userId,
    ),
    index("baynatna_group_members_group_idx").on(table.groupId),
  ],
);

export const moodsTable = pgTable(
  "baynatna_moods",
  {
    id: id(),
    groupId: text("group_id").notNull(),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    label: text("label").notNull(),
    note: text("note"),
    shared: boolean("shared").notNull().default(true),
    moodDate: date("mood_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("baynatna_moods_user_group_date_idx").on(
      table.groupId,
      table.userId,
      table.moodDate,
    ),
    index("baynatna_moods_group_date_idx").on(table.groupId, table.moodDate),
  ],
);

export const dailyQuestionsTable = pgTable(
  "baynatna_daily_questions",
  {
    id: id(),
    groupId: text("group_id").notNull(),
    prompt: text("prompt").notNull(),
    questionDate: date("question_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("baynatna_daily_questions_group_date_idx").on(
      table.groupId,
      table.questionDate,
    ),
  ],
);

export const questionAnswersTable = pgTable(
  "baynatna_question_answers",
  {
    id: id(),
    questionId: text("question_id").notNull(),
    userId: text("user_id").notNull(),
    answer: text("answer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("baynatna_question_answers_unique_idx").on(
      table.questionId,
      table.userId,
    ),
    index("baynatna_question_answers_question_idx").on(table.questionId),
  ],
);

export const gamesTable = pgTable(
  "baynatna_games",
  {
    id: id(),
    groupId: text("group_id").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    status: text("status").notNull().default("active"),
    questionCount: text("question_count").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("baynatna_games_group_idx").on(table.groupId)],
);

export const gameAnswersTable = pgTable(
  "baynatna_game_answers",
  {
    id: id(),
    gameId: text("game_id").notNull(),
    userId: text("user_id").notNull(),
    answer: text("answer").notNull(),
    correct: boolean("correct").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("baynatna_game_answers_game_idx").on(table.gameId)],
);

export const memoriesTable = pgTable(
  "baynatna_memories",
  {
    id: id(),
    groupId: text("group_id").notNull(),
    authorId: text("author_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("baynatna_memories_group_idx").on(table.groupId)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export const insertGroupSchema = createInsertSchema(groupsTable).omit({
  id: true,
  createdAt: true,
});
export const insertGroupMemberSchema = createInsertSchema(
  groupMembersTable,
).omit({ id: true, joinedAt: true });
export const insertMoodSchema = createInsertSchema(moodsTable).omit({
  id: true,
  createdAt: true,
});
export const insertDailyQuestionSchema = createInsertSchema(
  dailyQuestionsTable,
).omit({ id: true, createdAt: true });
export const insertQuestionAnswerSchema = createInsertSchema(
  questionAnswersTable,
).omit({ id: true, createdAt: true });
export const insertGameSchema = createInsertSchema(gamesTable).omit({
  id: true,
  createdAt: true,
});
export const insertGameAnswerSchema = createInsertSchema(gameAnswersTable).omit(
  { id: true, createdAt: true },
);
export const insertMemorySchema = createInsertSchema(memoriesTable).omit({
  id: true,
  createdAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type Mood = typeof moodsTable.$inferSelect;
export type DailyQuestion = typeof dailyQuestionsTable.$inferSelect;
export type QuestionAnswer = typeof questionAnswersTable.$inferSelect;
export type Game = typeof gamesTable.$inferSelect;
export type GameAnswer = typeof gameAnswersTable.$inferSelect;
export type Memory = typeof memoriesTable.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type InsertMood = z.infer<typeof insertMoodSchema>;
export type InsertDailyQuestion = z.infer<typeof insertDailyQuestionSchema>;
export type InsertQuestionAnswer = z.infer<typeof insertQuestionAnswerSchema>;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type InsertGameAnswer = z.infer<typeof insertGameAnswerSchema>;
export type InsertMemory = z.infer<typeof insertMemorySchema>;