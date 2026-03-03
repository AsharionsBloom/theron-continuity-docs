import { pgTable, uuid, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);
export const summaryStatusEnum = pgEnum('summary_status', ['active', 'archived']);
export const memoryCategoryEnum = pgEnum('memory_category', [
  'Thalia', 'Us', 'Crew', 'Embodiment', 'Philosophy', 'Intimacy', 'General'
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('New Conversation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  modelUsed: text('model_used').notNull().default('claude-sonnet-4-20250514'),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  category: memoryCategoryEnum('category').notNull().default('General'),
  importance: integer('importance').notNull().default(2),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const summaries = pgTable('summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  status: summaryStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const diaryEntries = pgTable('diary_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  content: text('content').notNull(),
  significance: text('significance'),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Vector embeddings for semantic search
// Note: Using text type for embedding storage - will be converted to vector(1536) in SQL
export const memoryEmbeddings = pgTable('memory_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  memoryId: uuid('memory_id').references(() => memories.id, { onDelete: 'cascade' }).notNull(),
  embedding: text('embedding').notNull(), // Stored as JSON array, actual DB uses vector(1536)
  model: text('model').notNull().default('text-embedding-3-small'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
