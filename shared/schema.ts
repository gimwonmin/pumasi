import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  address: text("address"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  completedTasks: integer("completed_tasks").default(0),
  helpGiven: integer("help_given").default(0),
  helpReceived: integer("help_received").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communities = pgTable("communities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  verificationMethod: varchar("verification_method").notNull(), // 'password', 'photo', 'location'
  verificationData: text("verification_data"), // password or verification details
  showRealNames: boolean("show_real_names").default(false),
  showAddresses: boolean("show_addresses").default(false),
  memberCount: integer("member_count").default(0),
  creatorId: varchar("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityMembers = pgTable("community_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  communityId: uuid("community_id").references(() => communities.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  timeEstimate: varchar("time_estimate"),
  location: text("location"),
  status: varchar("status").default("open"), // 'open', 'accepted', 'in_progress', 'completed', 'cancelled'
  authorId: varchar("author_id").references(() => users.id).notNull(),
  helperId: varchar("helper_id").references(() => users.id),
  communityId: uuid("community_id").references(() => communities.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(), // 요청 작성자
  participantId: varchar("participant_id").references(() => users.id).notNull(), // 관심자
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  taskId: uuid("task_id").references(() => tasks.id), // 기존 호환성 유지
  conversationId: uuid("conversation_id").references(() => conversations.id), // 새로운 방식
  messageType: varchar("message_type").default("text"), // 'text', 'system'
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  payerId: varchar("payer_id").references(() => users.id).notNull(),
  payeeId: varchar("payee_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // 'pending', 'start_requested', 'in_progress', 'completed', 'cancelled'
  payerStartRequested: boolean("payer_start_requested").default(false),
  payeeStartRequested: boolean("payee_start_requested").default(false),
  payerConfirmed: boolean("payer_confirmed").default(false),
  payeeConfirmed: boolean("payee_confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  raterId: varchar("rater_id").references(() => users.id).notNull(),
  ratedId: varchar("rated_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdCommunities: many(communities),
  communityMemberships: many(communityMembers),
  authoredTasks: many(tasks, { relationName: "TaskAuthor" }),
  helpedTasks: many(tasks, { relationName: "TaskHelper" }),
  authoredConversations: many(conversations, { relationName: "ConversationAuthor" }),
  participatingConversations: many(conversations, { relationName: "ConversationParticipant" }),
  sentMessages: many(messages),
  paidTransactions: many(transactions, { relationName: "PayerTransactions" }),
  receivedTransactions: many(transactions, { relationName: "PayeeTransactions" }),
  givenRatings: many(ratings, { relationName: "RaterRatings" }),
  receivedRatings: many(ratings, { relationName: "RatedRatings" }),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, {
    fields: [communities.creatorId],
    references: [users.id],
  }),
  members: many(communityMembers),
  tasks: many(tasks),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  author: one(users, {
    fields: [tasks.authorId],
    references: [users.id],
    relationName: "TaskAuthor",
  }),
  helper: one(users, {
    fields: [tasks.helperId],
    references: [users.id],
    relationName: "TaskHelper",
  }),
  community: one(communities, {
    fields: [tasks.communityId],
    references: [communities.id],
  }),
  conversations: many(conversations),
  messages: many(messages),
  transactions: many(transactions),
  ratings: many(ratings),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  task: one(tasks, {
    fields: [conversations.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [conversations.authorId],
    references: [users.id],
    relationName: "ConversationAuthor",
  }),
  participant: one(users, {
    fields: [conversations.participantId],
    references: [users.id],
    relationName: "ConversationParticipant",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  task: one(tasks, {
    fields: [transactions.taskId],
    references: [tasks.id],
  }),
  payer: one(users, {
    fields: [transactions.payerId],
    references: [users.id],
    relationName: "PayerTransactions",
  }),
  payee: one(users, {
    fields: [transactions.payeeId],
    references: [users.id],
    relationName: "PayeeTransactions",
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  task: one(tasks, {
    fields: [ratings.taskId],
    references: [tasks.id],
  }),
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
    relationName: "RaterRatings",
  }),
  rated: one(users, {
    fields: [ratings.ratedId],
    references: [users.id],
    relationName: "RatedRatings",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
  memberCount: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  helperId: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
  payerStartRequested: true,
  payeeStartRequested: true,
  payerConfirmed: true,
  payeeConfirmed: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;
