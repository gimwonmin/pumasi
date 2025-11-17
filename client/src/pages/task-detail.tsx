import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical, Star, MapPin, Clock, Share, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { TaskWithUser } from "@/lib/queryClient";

export default function TaskDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery<TaskWithUser>({
    queryKey: ["/api/tasks", id],
    enabled: !!id,
  });

  const acceptTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/tasks/${id}`, {
        helperId: user?.id,
        status: "accepted"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      toast({
        title: "작업 수락",
        description: "작업을 수락했습니다. 채팅에서 자세한 내용을 논의하세요.",
      });
      setLocation(`/tasks/${id}/chat`);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "작업 수락에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${id}`, {});
    },
    onSuccess: () => {
      // 모든 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      toast({
        title: "요청 취소",
        description: "도움 요청이 취소되었습니다.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "요청 취소에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        taskId: id,
        authorId: task?.authorId,
      });
      return response.json();
    },
    onSuccess: (conversation) => {
      setLocation(`/conversations/${conversation.id}/chat`);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "채팅 시작에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const startChat = () => {
    if (!task) return;
    
    // 도움을 주는 사람(helper)인 경우 새로운 conversation 시작
    if (!isAuthor) {
      startConversationMutation.mutate();
    } else {
      // 작성자인 경우 기존 로직 사용 (현재는 표시되지 않음)
      setLocation(`/tasks/${id}/chat`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">작업을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isAuthor = task.authorId === user?.id;
  const isHelper = task.helperId === user?.id;
  const canAccept = !isAuthor && !task.helperId && task.status === "open";
  const canCancel = isAuthor && (task.status === "open" || task.status === "accepted");

  return (
    <>
      <header className="bg-card border-b border-border p-4 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-bold flex-1" data-testid="text-task-title">
          {task.title}
        </h2>
        <Button variant="ghost" size="sm" data-testid="button-more">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </header>

      <div className="p-4">
        {/* Author Info */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <span className="font-medium" data-testid="text-author-initial">
              {task.author.firstName?.[0] || task.author.email?.[0] || "?"}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium" data-testid="text-author-name">
              {task.author.firstName ? `${task.author.firstName}**님` : "익명"}
            </p>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-accent fill-current" />
                <span data-testid="text-author-rating">
                  {task.author.rating || "0.0"} ({task.author.completedTasks || 0})
                </span>
              </div>
              <span>·</span>
              <span data-testid="text-author-completed">
                완료 {task.author.completedTasks || 0}건
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent" data-testid="text-task-reward">
              {parseInt(task.reward).toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-task-time">
              {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}
            </p>
          </div>
        </div>

        {/* Task Details */}
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">상세 설명</h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-task-description">
              {task.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {task.timeEstimate && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">예상 소요 시간</p>
                <p className="font-medium" data-testid="text-task-time-estimate">
                  {task.timeEstimate}
                </p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">카테고리</p>
              <p className="font-medium" data-testid="text-task-category">
                {task.category}
              </p>
            </div>
          </div>

          {/* Location */}
          {task.location && (
            <div>
              <h3 className="font-medium mb-2">위치</h3>
              <div className="bg-muted rounded-lg p-3 flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm" data-testid="text-task-location">
                  {task.location}
                </span>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <h3 className="font-medium mb-2">상태</h3>
            <div className="bg-muted rounded-lg p-3">
              <span className={`text-sm px-2 py-1 rounded-full ${
                task.status === 'open' ? 'bg-primary text-primary-foreground' :
                task.status === 'accepted' ? 'bg-secondary text-secondary-foreground' :
                task.status === 'in_progress' ? 'bg-accent text-accent-foreground' :
                'bg-muted-foreground text-muted'
              }`} data-testid="text-task-status">
                {task.status === 'open' ? '요청 중' :
                 task.status === 'accepted' ? '수락됨' :
                 task.status === 'in_progress' ? '진행 중' :
                 task.status === 'completed' ? '완료' : '취소됨'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {canAccept && (
            <Button
              className="w-full"
              onClick={() => acceptTaskMutation.mutate()}
              disabled={acceptTaskMutation.isPending}
              data-testid="button-accept-task"
            >
              {acceptTaskMutation.isPending ? "수락 중..." : "도움 주기"}
            </Button>
          )}
          
          {!isAuthor && (
            <Button
              className="w-full"
              onClick={startChat}
              disabled={startConversationMutation.isPending}
              data-testid="button-start-chat"
            >
              {startConversationMutation.isPending ? "채팅 시작 중..." : "채팅하기"}
            </Button>
          )}

          {canCancel && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => cancelTaskMutation.mutate()}
              disabled={cancelTaskMutation.isPending}
              data-testid="button-cancel-task"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {cancelTaskMutation.isPending ? "취소 중..." : "요청 취소"}
            </Button>
          )}
          
          <Button variant="outline" className="w-full" data-testid="button-share">
            <Share className="h-4 w-4 mr-2" />
            공유하기
          </Button>
        </div>
      </div>
    </>
  );
}
