import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, Clock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import MobileNav from "@/components/mobile-nav";
import type { Task, User, Message } from "@shared/schema";

type ChatTask = Task & { 
  author: User; 
  helper?: User; 
  lastMessage?: Message;
};

export default function Chats() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { markChatAsRead } = useChatNotifications();
  const [deletedChats, setDeletedChats] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const { data: allChats, isLoading } = useQuery<ChatTask[]>({
    queryKey: ["/api/chats"],
    enabled: !!user,
  });

  // 삭제된 채팅을 제외한 채팅 목록
  const chats = allChats?.filter(chat => !deletedChats.includes(chat.id)) || [];

  // 로칼 스토리지에서 삭제된 채팅 목록 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('deletedChats');
    if (saved) {
      try {
        setDeletedChats(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse deleted chats:', error);
      }
    }
  }, []);

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      const newDeletedChats = [...deletedChats, chatToDelete];
      setDeletedChats(newDeletedChats);
      localStorage.setItem('deletedChats', JSON.stringify(newDeletedChats));
      
      toast({
        title: "채팅 삭제",
        description: "채팅이 목록에서 삭제되었습니다.",
      });
    }
    setShowDeleteConfirm(false);
    setChatToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setChatToDelete(null);
  };

  const formatTime = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "방금전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const getOtherUser = (chat: ChatTask) => {
    return chat.authorId === user?.id ? chat.helper : chat.author;
  };

  return (
    <>
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold">채팅</h1>
        </div>
      </header>

      <main className="pb-20 p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-4">로딩 중...</p>
          </div>
        ) : !chats || chats.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">아직 채팅이 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              도움 요청을 올리거나 도움을 주면 채팅을 시작할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const otherUser = getOtherUser(chat);
              return (
                <div
                  key={chat.id}
                  className="bg-card border border-border rounded-lg p-4 relative group hover:bg-accent/50 transition-colors"
                  data-testid={`chat-item-${chat.id}`}
                >
                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    data-testid={`delete-chat-${chat.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      markChatAsRead(chat.id);
                      setLocation(`/tasks/${chat.id}/chat`);
                    }}
                  >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium" data-testid={`chat-user-initial-${chat.id}`}>
                        {otherUser?.firstName?.[0] || otherUser?.email?.[0] || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sm truncate" data-testid={`chat-title-${chat.id}`}>
                          {chat.title}
                        </h3>
                        {chat.lastMessage?.createdAt && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            <span data-testid={`chat-time-${chat.id}`}>
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {otherUser?.firstName || "상대방"}님과의 채팅
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate" data-testid={`chat-last-message-${chat.id}`}>
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4">채팅 삭제</h3>
            <p className="text-sm text-muted-foreground mb-6">
              이 채팅을 목록에서 삭제하시겠습니까?<br />
              (메시지는 삭제되지 않으며 상대방에게는 영향을 주지 않습니다)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="flex-1"
                data-testid="cancel-delete-chat"
              >
                취소
              </Button>
              <Button
                onClick={confirmDelete}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                data-testid="confirm-delete-chat"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </>
  );
}