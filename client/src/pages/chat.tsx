import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Send, Route, MapPin, CreditCard, X, HandHeart, CheckCircle, Star, Clock, Bell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import ChatMessage from "@/components/chat-message";
import type { TaskWithUser, MessageWithSender } from "@/lib/queryClient";
import type { Transaction, Rating } from "@shared/schema";

export default function Chat() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState("");
  const [tripStarted, setTripStarted] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  const { data: task } = useQuery<TaskWithUser>({
    queryKey: ["/api/tasks", id],
    enabled: !!id,
  });

  const { data: messages } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/tasks", id, "messages"],
    enabled: !!id,
  });

  const { data: transaction } = useQuery<Transaction>({
    queryKey: ["/api/tasks", id, "transaction"],
    enabled: !!id && task?.status === "accepted",
  });

  const { data: myRating } = useQuery<Rating | null>({
    queryKey: ["/api/tasks", id, "rating"],
    enabled: !!id && task?.status === "completed",
  });

  // WebSocket for real-time messages
  useWebSocket(`/ws`, {
    onMessage: (data) => {
      if (data.type === 'new_message' && data.taskId === id) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "messages"] });
      }
      if (data.type === 'transaction_start_request' && data.taskId === id) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "transaction"] });
        
        // 알림 표시
        if (data.otherUserId === user?.id) {
          if (data.bothRequested) {
            toast({
              title: "거래 시작!",
              description: "양쪽이 모두 확인하여 거래가 시작되었습니다.",
            });
          } else {
            toast({
              title: "거래 시작 요청",
              description: "상대방이 거래 시작을 요청했습니다. 확인해주세요!",
            });
          }
        }
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/tasks/${id}/messages`, { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "messages"] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "메시지 전송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tasks/${id}/transaction`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "transaction"] });
      toast({
        title: "거래 생성",
        description: "거래가 생성되었습니다. 양쪽이 시작을 확인해야 합니다.",
      });
    },
  });

  const requestTransactionStartMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      await apiRequest("PATCH", `/api/transactions/${transaction.id}/start-request`, { taskId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "transaction"] });
      toast({
        title: "거래 시작 요청",
        description: "거래 시작을 요청했습니다. 상대방의 확인을 기다리고 있습니다.",
      });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      await apiRequest("PATCH", `/api/transactions/${transaction.id}/confirm`, { taskId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "transaction"] });
      toast({
        title: "결제 확인",
        description: "결제를 확인했습니다.",
      });
    },
  });

  const cancelTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!transaction) return;
      await apiRequest("PATCH", `/api/transactions/${transaction.id}`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "transaction"] });
      toast({
        title: "거래 취소",
        description: "거래가 취소되었습니다.",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/tasks/${id}`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      toast({
        title: "요청 완료",
        description: "도움 요청이 완료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "요청 완료에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData: { rating: number; comment?: string }) => {
      const otherUserId = task?.authorId === user?.id ? task?.helperId : task?.authorId;
      
      if (!otherUserId) {
        throw new Error("상대방 정보를 찾을 수 없습니다.");
      }
      
      await apiRequest("POST", "/api/ratings", {
        taskId: id,
        ratedId: otherUserId,
        rating: ratingData.rating,
        comment: ratingData.comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id, "rating"] });
      setShowRatingModal(false);
      setSelectedRating(0);
      setRatingComment("");
      toast({
        title: "평점 등록",
        description: "평점이 성공적으로 등록되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "평점 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRating = () => {
    if (selectedRating > 0) {
      submitRatingMutation.mutate({
        rating: selectedRating,
        comment: ratingComment.trim() || undefined,
      });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const otherUser = task?.authorId === user?.id ? task?.helper : task?.author;
  const isAuthor = task?.authorId === user?.id;
  const isTransactionAccepted = task?.status === "accepted";
  const isPaymentConfirmed = transaction?.status === "completed";
  const isTaskCompleted = task?.status === "completed";
  
  // 거래 시작 요청 상태
  const isPayer = transaction?.payerId === user?.id;
  const isPayee = transaction?.payeeId === user?.id;
  const hasRequestedStart = isPayer ? transaction?.payerStartRequested : transaction?.payeeStartRequested;
  const otherHasRequestedStart = isPayer ? transaction?.payeeStartRequested : transaction?.payerStartRequested;
  const isTransactionInProgress = transaction?.status === "in_progress";
  const isStartRequested = transaction?.status === "start_requested";

  return (
    <>
      <header className="bg-card border-b border-border p-4 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/tasks/${id}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xs font-medium" data-testid="text-other-user-initial">
              {otherUser?.firstName?.[0] || otherUser?.email?.[0] || "?"}
            </span>
          </div>
          <div>
            <p className="font-medium" data-testid="text-other-user-name">
              {otherUser?.firstName ? `${otherUser.firstName}**님` : "사용자"}
            </p>
            <p className="text-xs text-muted-foreground">온라인</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" data-testid="button-call">
          <Phone className="h-4 w-4" />
        </Button>
      </header>

      {/* Transaction Status Banner */}
      {isTransactionAccepted && (
        <div className="bg-accent text-accent-foreground p-3 text-center text-sm font-medium">
          <HandHeart className="inline h-4 w-4 mr-2" />
          거래가 체결되었습니다
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 p-4 space-y-4 max-h-96 overflow-y-auto">
        {messages?.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === user?.id}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Complete Task Button - Only for Author */}
      {isAuthor && !isTaskCompleted && task?.status !== "cancelled" && (
        <div className="bg-card border-t border-border p-4">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => completeTaskMutation.mutate()}
            disabled={completeTaskMutation.isPending}
            data-testid="button-complete-task"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {completeTaskMutation.isPending ? "완료 처리 중..." : "요청 완료"}
          </Button>
        </div>
      )}

      {/* Task Completed Banner */}
      {isTaskCompleted && (
        <div className="bg-green-100 text-green-800 p-3 text-center text-sm font-medium">
          <CheckCircle className="inline h-4 w-4 mr-2" />
          요청이 완료되었습니다
        </div>
      )}

      {/* Rating Section - Show after completion */}
      {isTaskCompleted && !myRating && otherUser && (
        <div className="bg-card border-t border-border p-4">
          <div className="text-center">
            <h3 className="font-medium mb-2">상대방에게 평점을 매겨주세요</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {otherUser?.firstName || "상대방"}님과의 거래는 어떠셨나요?
            </p>
            <Button
              onClick={() => setShowRatingModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              data-testid="button-rate-user"
            >
              <Star className="h-4 w-4 mr-2" />
              평점 매기기
            </Button>
          </div>
        </div>
      )}

      {/* Rating Completed */}
      {isTaskCompleted && myRating && (
        <div className="bg-card border-t border-border p-4">
          <div className="text-center">
            <div className="flex justify-center items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= myRating.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              평점을 매겨주셨습니다
            </p>
          </div>
        </div>
      )}

      {/* Transaction Controls */}
      {isTransactionAccepted && !isPaymentConfirmed && !isTaskCompleted && (
        <div className="bg-card border-t border-border p-4">
          {/* 거래가 없는 경우: 거래 생성 */}
          {!transaction && (
            <Button
              className="w-full mb-4"
              onClick={() => createTransactionMutation.mutate()}
              disabled={createTransactionMutation.isPending}
              data-testid="button-create-transaction"
            >
              {createTransactionMutation.isPending ? "거래 생성 중..." : "거래 생성"}
            </Button>
          )}
          
          {/* 거래가 있고 아직 진행 중이 아닌 경우 */}
          {transaction && !isTransactionInProgress && (
            <div className="space-y-3">
              {/* 아무도 시작 요청을 안한 경우 */}
              {!hasRequestedStart && !otherHasRequestedStart && (
                <Button
                  className="w-full"
                  onClick={() => requestTransactionStartMutation.mutate()}
                  disabled={requestTransactionStartMutation.isPending}
                  data-testid="button-request-start"
                >
                  {requestTransactionStartMutation.isPending ? "요청 중..." : "거래 시작"}
                </Button>
              )}
              
              {/* 내가 요청했지만 상대방이 안한 경우 */}
              {hasRequestedStart && !otherHasRequestedStart && (
                <div className="text-center space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2 text-amber-700 dark:text-amber-300">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">거래 시작 요청됨</span>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      상대방의 확인을 기다리고 있습니다
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => cancelTransactionMutation.mutate()}
                    disabled={cancelTransactionMutation.isPending}
                    data-testid="button-cancel-request"
                  >
                    <X className="h-4 w-4 mr-2" />
                    거래 취소
                  </Button>
                </div>
              )}
              
              {/* 상대방이 요청했지만 내가 안한 경우 */}
              {!hasRequestedStart && otherHasRequestedStart && (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
                      <Bell className="h-4 w-4" />
                      <span className="text-sm font-medium">거래 시작 요청받음</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      상대방이 거래 시작을 요청했습니다
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => requestTransactionStartMutation.mutate()}
                      disabled={requestTransactionStartMutation.isPending}
                      data-testid="button-accept-start"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      수락
                    </Button>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => cancelTransactionMutation.mutate()}
                      disabled={cancelTransactionMutation.isPending}
                      data-testid="button-decline-start"
                    >
                      <X className="h-4 w-4 mr-2" />
                      거절
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 거래가 진행 중인 경우: 기존 컨트롤들 */}
          {transaction && isTransactionInProgress && (
            <>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">거래 진행 중</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
                  양쪽이 모두 확인하여 거래가 시작되었습니다
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button
                  variant={tripStarted ? "default" : "secondary"}
                  className="flex items-center justify-center space-x-2"
                  onClick={() => setTripStarted(!tripStarted)}
                  data-testid="button-trip-start"
                >
                  <Route className="h-4 w-4" />
                  <span>{tripStarted ? "이동 중" : "출발"}</span>
                </Button>
                <Button
                  variant="outline"
                  disabled={!tripStarted}
                  className="flex items-center justify-center space-x-2"
                  data-testid="button-trip-end"
                >
                  <MapPin className="h-4 w-4" />
                  <span>도착</span>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="flex items-center justify-center space-x-2"
                  onClick={() => confirmPaymentMutation.mutate()}
                  disabled={confirmPaymentMutation.isPending}
                  data-testid="button-confirm-payment"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {confirmPaymentMutation.isPending ? "확인 중..." : "결제 완료"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center space-x-2"
                  onClick={() => cancelTransactionMutation.mutate()}
                  disabled={cancelTransactionMutation.isPending}
                  data-testid="button-cancel-transaction"
                >
                  <X className="h-4 w-4" />
                  <span>거래 취소</span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-center">
              {otherUser?.firstName || "상대방"}님에게 평점 매기기
            </h3>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="p-1"
                  data-testid={`rating-star-${star}`}
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= selectedRating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 hover:text-yellow-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="평가 내용을 입력해주세요 (선택사항)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4 text-sm"
              rows={3}
              data-testid="input-rating-comment"
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setRatingComment("");
                }}
                className="flex-1"
                data-testid="button-cancel-rating"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmitRating}
                disabled={selectedRating === 0 || submitRatingMutation.isPending}
                className="flex-1"
                data-testid="button-submit-rating"
              >
                {submitRatingMutation.isPending ? "등록 중..." : "등록"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex space-x-2">
          <Input
            placeholder="메시지를 입력하세요..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="w-10 h-10 p-0"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
