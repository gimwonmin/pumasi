import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCommunitySchema, insertTaskSchema, insertConversationSchema, insertMessageSchema, insertRatingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Community routes
  app.get('/api/communities', isAuthenticated, async (req, res) => {
    try {
      const communities = await storage.getCommunities();
      res.json(communities);
    } catch (error) {
      console.error("Error fetching communities:", error);
      res.status(500).json({ message: "Failed to fetch communities" });
    }
  });

  app.post('/api/communities', isAuthenticated, async (req: any, res) => {
    try {
      const communityData = insertCommunitySchema.parse({
        ...req.body,
        creatorId: req.user.claims.sub,
      });
      const community = await storage.createCommunity(communityData);
      // Auto-join creator
      await storage.joinCommunity(req.user.claims.sub, community.id);
      res.json(community);
    } catch (error) {
      console.error("Error creating community:", error);
      res.status(500).json({ message: "Failed to create community" });
    }
  });

  app.post('/api/communities/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const membership = await storage.joinCommunity(req.user.claims.sub, req.params.id);
      res.json(membership);
    } catch (error) {
      console.error("Error joining community:", error);
      res.status(500).json({ message: "Failed to join community" });
    }
  });

  app.delete('/api/communities/:id', isAuthenticated, async (req: any, res) => {
    try {
      // 공동체 정보 가져오기
      const communities = await storage.getCommunities();
      const community = communities.find(c => c.id === req.params.id);
      
      if (!community) {
        return res.status(404).json({ message: "Community not found" });
      }

      // 제작자 확인
      if (community.creatorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Only the creator can delete this community" });
      }

      await storage.deleteCommunity(req.params.id);
      res.json({ message: "Community deleted successfully" });
    } catch (error) {
      console.error("Error deleting community:", error);
      res.status(500).json({ message: "Failed to delete community" });
    }
  });

  app.get('/api/user/communities', isAuthenticated, async (req: any, res) => {
    try {
      const communities = await storage.getUserCommunities(req.user.claims.sub);
      res.json(communities);
    } catch (error) {
      console.error("Error fetching user communities:", error);
      res.status(500).json({ message: "Failed to fetch user communities" });
    }
  });

  // Task routes
  app.get('/api/communities/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      // 사용자가 해당 공동체의 멤버인지 확인
      const isMember = await storage.isCommunityMember(req.user.claims.sub, req.params.id);
      if (!isMember) {
        return res.status(403).json({ message: "해당 공동체의 멤버만 도움 요청을 볼 수 있습니다." });
      }
      
      const tasks = await storage.getTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // 사용자가 해당 작업의 공동체 멤버인지 확인
      const isMember = await storage.isCommunityMember(req.user.claims.sub, task.communityId);
      if (!isMember) {
        return res.status(403).json({ message: "해당 공동체의 멤버만 도움 요청을 볼 수 있습니다." });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      // 사용자가 해당 공동체의 멤버인지 확인
      const isMember = await storage.isCommunityMember(req.user.claims.sub, req.body.communityId);
      if (!isMember) {
        return res.status(403).json({ message: "해당 공동체의 멤버만 도움 요청을 작성할 수 있습니다." });
      }
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        authorId: req.user.claims.sub,
      });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Prevent author from accepting their own task
      if (req.body.helperId && req.body.helperId === task.authorId) {
        return res.status(400).json({ message: "작성자는 자신의 요청을 수락할 수 없습니다." });
      }
      
      // Only author can update task details, helper can accept
      if (task.authorId !== req.user.claims.sub && req.body.helperId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized to update this task" });
      }

      const updatedTask = await storage.updateTask(req.params.id, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Cancel task route
  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Only author can cancel their own task
      if (task.authorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "작성자만 요청을 취소할 수 있습니다." });
      }

      // Can only cancel if task is open or accepted
      if (task.status !== 'open' && task.status !== 'accepted') {
        return res.status(400).json({ message: "진행 중이거나 완료된 요청은 취소할 수 없습니다." });
      }

      const cancelledTask = await storage.updateTask(req.params.id, { status: 'cancelled' });
      res.json(cancelledTask);
    } catch (error) {
      console.error("Error cancelling task:", error);
      res.status(500).json({ message: "Failed to cancel task" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.claims.sub);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        participantId: req.user.claims.sub, // 요청하는 사용자가 participant
      });
      const conversation = await storage.getOrCreateConversation(
        conversationData.taskId,
        conversationData.authorId,
        conversationData.participantId
      );
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getConversationMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
        senderId: req.user.claims.sub,
      });
      const message = await storage.createMessage(messageData);
      
      // Broadcast message via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            conversationId: req.params.id,
            message,
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating conversation message:", error);
      res.status(500).json({ message: "Failed to create conversation message" });
    }
  });

  // Message routes (기존 호환성 유지)
  app.get('/api/tasks/:id/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getTaskMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/tasks/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        taskId: req.params.id,
        senderId: req.user.claims.sub,
      });
      const message = await storage.createMessage(messageData);
      
      // Broadcast message via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_message',
            taskId: req.params.id,
            message,
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Transaction routes
  app.get('/api/tasks/:id/transaction', isAuthenticated, async (req, res) => {
    try {
      const transaction = await storage.getTaskTransaction(req.params.id);
      res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  app.post('/api/tasks/:id/transaction', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const transaction = await storage.createTransaction({
        taskId: req.params.id,
        payerId: task.authorId,
        payeeId: task.helperId!,
        amount: task.reward,
      });
      
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Transaction start request route
  app.patch('/api/transactions/:id/start-request', isAuthenticated, async (req: any, res) => {
    try {
      const transaction = await storage.getTaskTransaction(req.body.taskId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const updates: any = {};
      let userRole = '';
      
      if (transaction.payerId === req.user.claims.sub) {
        updates.payerStartRequested = true;
        userRole = 'payer';
      } else if (transaction.payeeId === req.user.claims.sub) {
        updates.payeeStartRequested = true;
        userRole = 'payee';
      } else {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // If both requested, start transaction
      if ((updates.payerStartRequested && transaction.payeeStartRequested) || 
          (updates.payeeStartRequested && transaction.payerStartRequested)) {
        updates.status = 'in_progress';
      } else {
        updates.status = 'start_requested';
      }

      const updatedTransaction = await storage.updateTransaction(transaction.id, updates);
      
      // Send WebSocket notification to the other party
      const otherUserId = userRole === 'payer' ? transaction.payeeId : transaction.payerId;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'transaction_start_request',
            taskId: req.body.taskId,
            requestedBy: req.user.claims.sub,
            otherUserId: otherUserId,
            bothRequested: updates.status === 'in_progress',
          }));
        }
      });
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error requesting transaction start:", error);
      res.status(500).json({ message: "Failed to request transaction start" });
    }
  });

  app.patch('/api/transactions/:id/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const transaction = await storage.getTaskTransaction(req.body.taskId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const updates: any = {};
      if (transaction.payerId === req.user.claims.sub) {
        updates.payerConfirmed = true;
      } else if (transaction.payeeId === req.user.claims.sub) {
        updates.payeeConfirmed = true;
      } else {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // If both confirmed, complete transaction
      if ((updates.payerConfirmed && transaction.payeeConfirmed) || 
          (updates.payeeConfirmed && transaction.payerConfirmed)) {
        updates.status = 'completed';
        updates.completedAt = new Date();
      }

      const updatedTransaction = await storage.updateTransaction(transaction.id, updates);
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error confirming transaction:", error);
      res.status(500).json({ message: "Failed to confirm transaction" });
    }
  });

  // Rating routes
  app.post('/api/ratings', isAuthenticated, async (req: any, res) => {
    try {
      const ratingData = insertRatingSchema.parse({
        ...req.body,
        raterId: req.user.claims.sub,
      });
      const rating = await storage.createRating(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(500).json({ message: "Failed to create rating" });
    }
  });

  app.get('/api/tasks/:taskId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const rating = await storage.getTaskRating(req.params.taskId, req.user.claims.sub);
      res.json(rating || null);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Chat routes
  app.get('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      // 기존 task 기반 채팅과 새로운 conversation 기반 채팅을 모두 반환
      const taskChats = await storage.getUserChats(req.user.claims.sub);
      const conversations = await storage.getUserConversations(req.user.claims.sub);
      
      // conversation을 task 형태로 변환하여 호환성 유지
      const conversationChats = conversations.map(conv => ({
        ...conv.task,
        author: conv.author,
        helper: conv.task.authorId === req.user.claims.sub ? conv.participant : conv.author,
        lastMessage: conv.lastMessage,
        conversationId: conv.id, // conversation ID 추가
      }));
      
      // 중복 제거 (같은 task에 대한 기존 채팅이 있으면 conversation 우선)
      const chatMap = new Map();
      
      // 기존 task 채팅 추가
      taskChats.forEach(chat => {
        chatMap.set(chat.id, chat);
      });
      
      // conversation 채팅 추가 (덮어쓰기)
      conversationChats.forEach(chat => {
        chatMap.set(chat.id, chat);
      });
      
      res.json(Array.from(chatMap.values()));
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Handle different message types (join task room, etc.)
        console.log('WebSocket message:', message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
