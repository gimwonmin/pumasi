import {
  users,
  communities,
  communityMembers,
  tasks,
  conversations,
  messages,
  transactions,
  ratings,
  type User,
  type UpsertUser,
  type Community,
  type InsertCommunity,
  type CommunityMember,
  type Task,
  type InsertTask,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Transaction,
  type InsertTransaction,
  type Rating,
  type InsertRating,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Community operations
  isCommunityMember(userId: string, communityId: string): Promise<boolean>;
  getCommunities(): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  deleteCommunity(id: string): Promise<void>;
  joinCommunity(userId: string, communityId: string): Promise<CommunityMember>;
  getUserCommunities(userId: string): Promise<Community[]>;
  
  // Task operations
  getTasks(communityId: string): Promise<(Task & { author: User; helper?: User })[]>;
  getTask(id: string): Promise<(Task & { author: User; helper?: User }) | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  
  // Conversation operations
  getOrCreateConversation(taskId: string, authorId: string, participantId: string): Promise<Conversation>;
  getConversationMessages(conversationId: string): Promise<(Message & { sender: User })[]>;
  
  // Message operations
  getTaskMessages(taskId: string): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Transaction operations
  getTaskTransaction(taskId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  
  // Rating operations
  createRating(rating: InsertRating): Promise<Rating>;
  getUserRatings(userId: string): Promise<Rating[]>;
  getTaskRating(taskId: string, raterId: string): Promise<Rating | undefined>;
  
  // Chat operations
  getUserChats(userId: string): Promise<(Task & { author: User; helper?: User; lastMessage?: Message })[]>;
  getUserConversations(userId: string): Promise<(Conversation & { task: Task; author: User; participant: User; lastMessage?: Message })[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Community operations
  async isCommunityMember(userId: string, communityId: string): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(and(
        eq(communityMembers.userId, userId),
        eq(communityMembers.communityId, communityId)
      ));
    return !!membership;
  }

  async getCommunities(): Promise<Community[]> {
    return await db.select().from(communities).orderBy(desc(communities.createdAt));
  }

  async createCommunity(community: InsertCommunity): Promise<Community> {
    const [newCommunity] = await db.insert(communities).values(community).returning();
    return newCommunity;
  }

  async deleteCommunity(id: string): Promise<void> {
    // 공동체와 관련된 모든 데이터를 삭제
    // 1. 공동체 멤버 삭제
    await db.delete(communityMembers).where(eq(communityMembers.communityId, id));
    
    // 2. 공동체에 속한 태스크들 찾기
    const communityTasks = await db.select().from(tasks).where(eq(tasks.communityId, id));
    
    for (const task of communityTasks) {
      // 태스크와 관련된 conversations 찾기
      const taskConversations = await db.select().from(conversations).where(eq(conversations.taskId, task.id));
      
      // 각 conversation의 메시지들 삭제
      for (const conversation of taskConversations) {
        await db.delete(messages).where(eq(messages.conversationId, conversation.id));
      }
      
      // 태스크와 관련된 메시지 삭제 (taskId로 저장된 메시지)
      await db.delete(messages).where(eq(messages.taskId, task.id));
      
      // 태스크와 관련된 conversation 삭제
      await db.delete(conversations).where(eq(conversations.taskId, task.id));
      
      // 태스크와 관련된 거래 삭제
      await db.delete(transactions).where(eq(transactions.taskId, task.id));
      
      // 태스크와 관련된 평점 삭제
      await db.delete(ratings).where(eq(ratings.taskId, task.id));
    }
    
    // 3. 태스크 삭제
    await db.delete(tasks).where(eq(tasks.communityId, id));
    
    // 4. 공동체 삭제
    await db.delete(communities).where(eq(communities.id, id));
  }

  async joinCommunity(userId: string, communityId: string): Promise<CommunityMember> {
    const [membership] = await db
      .insert(communityMembers)
      .values({ userId, communityId })
      .returning();
    
    // Update member count
    const count = await db.select().from(communityMembers).where(eq(communityMembers.communityId, communityId));
    await db
      .update(communities)
      .set({ memberCount: count.length })
      .where(eq(communities.id, communityId));
    
    return membership;
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const userCommunities = await db
      .select({ community: communities })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(eq(communityMembers.userId, userId));
    
    return userCommunities.map(uc => uc.community);
  }

  // Task operations
  async getTasks(communityId: string): Promise<(Task & { author: User; helper?: User })[]> {
    const tasksList = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.communityId, communityId),
        ne(tasks.status, 'cancelled'),
        ne(tasks.status, 'completed')
      ))
      .orderBy(desc(tasks.createdAt));

    const tasksWithUsers = await Promise.all(
      tasksList.map(async (task) => {
        const [author] = await db.select().from(users).where(eq(users.id, task.authorId));
        const helper = task.helperId 
          ? (await db.select().from(users).where(eq(users.id, task.helperId)))[0]
          : undefined;
        
        return {
          ...task,
          author,
          helper,
        };
      })
    );

    return tasksWithUsers;
  }

  async getTask(id: string): Promise<(Task & { author: User; helper?: User }) | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;

    const [author] = await db.select().from(users).where(eq(users.id, task.authorId));
    const helper = task.helperId 
      ? (await db.select().from(users).where(eq(users.id, task.helperId)))[0]
      : undefined;

    return {
      ...task,
      author,
      helper,
    };
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  // Message operations
  async getTaskMessages(taskId: string): Promise<(Message & { sender: User })[]> {
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.createdAt);

    return messagesWithSenders.map(m => ({
      ...m.message,
      sender: m.sender,
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Transaction operations
  async getTaskTransaction(taskId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.taskId, taskId));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values({
      ...transaction,
      status: 'pending'
    }).returning();
    return newTransaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  // Rating operations
  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await db.insert(ratings).values(rating).returning();
    
    // Update user's rating average
    const userRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratedId, rating.ratedId));
    
    const avgRating = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;
    
    await db
      .update(users)
      .set({ rating: avgRating.toFixed(2) })
      .where(eq(users.id, rating.ratedId));
    
    return newRating;
  }

  async getUserRatings(userId: string): Promise<Rating[]> {
    return await db
      .select()
      .from(ratings)
      .where(eq(ratings.ratedId, userId))
      .orderBy(desc(ratings.createdAt));
  }

  async getTaskRating(taskId: string, raterId: string): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.taskId, taskId), eq(ratings.raterId, raterId)));
    return rating;
  }

  // Chat operations
  async getUserChats(userId: string): Promise<(Task & { author: User; helper?: User; lastMessage?: Message })[]> {
    // 사용자가 참여한 task들 중 메시지가 있는 것들 가져오기
    const userTasks = await db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(messages, eq(tasks.id, messages.taskId))
      .where(or(
        eq(tasks.authorId, userId),
        eq(tasks.helperId, userId)
      ))
      .groupBy(tasks.id)
      .orderBy(desc(tasks.updatedAt));
    
    const tasksWithDetails = await Promise.all(
      userTasks.map(async ({ task }) => {
        const [author] = await db.select().from(users).where(eq(users.id, task.authorId));
        const helper = task.helperId 
          ? (await db.select().from(users).where(eq(users.id, task.helperId)))[0]
          : undefined;
        
        // 최근 메시지 가져오기
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.taskId, task.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        return {
          ...task,
          author,
          helper,
          lastMessage,
        };
      })
    );
    
    return tasksWithDetails;
  }

  // Conversation operations
  async getOrCreateConversation(taskId: string, authorId: string, participantId: string): Promise<Conversation> {
    // 기존 conversation 찾기
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.taskId, taskId),
          eq(conversations.authorId, authorId),
          eq(conversations.participantId, participantId)
        )
      );

    if (existingConversation) {
      return existingConversation;
    }

    // 새 conversation 생성
    const [newConversation] = await db
      .insert(conversations)
      .values({
        taskId,
        authorId,
        participantId,
      })
      .returning();

    return newConversation;
  }

  async getConversationMessages(conversationId: string): Promise<(Message & { sender: User })[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        conversationId: messages.conversationId,
        taskId: messages.taskId,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getUserConversations(userId: string): Promise<(Conversation & { task: Task; author: User; participant: User; lastMessage?: Message })[]> {
    // 사용자가 참여한 conversations 가져오기
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.authorId, userId),
          eq(conversations.participantId, userId)
        )
      );

    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conversation) => {
        const [task] = await db.select().from(tasks).where(eq(tasks.id, conversation.taskId));
        const [author] = await db.select().from(users).where(eq(users.id, conversation.authorId));
        const [participant] = await db.select().from(users).where(eq(users.id, conversation.participantId));
        
        // 최근 메시지 가져오기
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        return {
          ...conversation,
          task,
          author,
          participant,
          lastMessage,
        };
      })
    );
    
    return conversationsWithDetails;
  }
}

export const storage = new DatabaseStorage();
