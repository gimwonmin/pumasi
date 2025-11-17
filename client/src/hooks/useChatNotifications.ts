import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useWebSocket } from './useWebSocket';
import type { Task, User, Message } from '@shared/schema';

type ChatTask = Task & { 
  author: User; 
  helper?: User; 
  lastMessage?: Message;
};

export function useChatNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimes, setLastReadTimes] = useState<Record<string, string>>({});

  // 채팅 목록 가져오기
  const { data: allChats } = useQuery<ChatTask[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  // 로컬 스토리지에서 마지막 읽은 시간 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('lastReadTimes');
    if (saved) {
      try {
        setLastReadTimes(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse last read times:', error);
      }
    }
  }, []);

  // 읽지 않은 메시지 수 계산
  useEffect(() => {
    if (!allChats || !user) return;

    let count = 0;
    allChats.forEach(chat => {
      // 자신이 올린 요청에 대한 채팅만 확인 (다른 사람이 도움을 주는 경우)
      if (chat.authorId === user.id && chat.helperId && chat.lastMessage) {
        const lastReadTime = lastReadTimes[chat.id];
        const lastMessageTime = chat.lastMessage.createdAt;
        
        // 마지막 메시지가 다른 사람이 보낸 것이고, 읽지 않은 경우
        if (chat.lastMessage.senderId !== user.id) {
          if (!lastReadTime || (lastMessageTime && new Date(lastMessageTime) > new Date(lastReadTime))) {
            count++;
          }
        }
      }
    });
    
    setUnreadCount(count);
  }, [allChats, lastReadTimes, user]);

  // WebSocket으로 실시간 알림 업데이트
  useWebSocket('/ws', {
    onMessage: (data) => {
      if (data.type === 'new_message' && data.message && user) {
        // 다른 사람이 내 요청에 메시지를 보낸 경우
        const taskId = data.taskId;
        const message = data.message;
        
        // 메시지 보낸 사람이 나가 아닌 경우에만 알림 추가
        if (message.senderId !== user.id) {
          setUnreadCount(prev => prev + 1);
        }
      }
    }
  });

  // 채팅을 읽음으로 표시
  const markChatAsRead = (chatId: string) => {
    const now = new Date().toISOString();
    const newLastReadTimes = { ...lastReadTimes, [chatId]: now };
    setLastReadTimes(newLastReadTimes);
    localStorage.setItem('lastReadTimes', JSON.stringify(newLastReadTimes));
    
    // 해당 채팅의 읽지 않은 개수 감소
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    unreadCount,
    markChatAsRead
  };
}