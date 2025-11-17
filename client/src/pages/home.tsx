import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings, MapPin, Clock, ChevronDown, Trash2 } from "lucide-react";
import TaskCard from "@/components/task-card";
import MobileNav from "@/components/mobile-nav";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import type { Community } from "@shared/schema";
import type { TaskWithUser } from "@/lib/queryClient";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: communitiesData } = useQuery<Community[]>({
    queryKey: ["/api/user/communities"],
    retry: false,
  });

  // 중복 제거를 위한 고유한 공동체 목록 생성
  const communities = communitiesData ? 
    communitiesData.filter((community, index, self) => 
      index === self.findIndex(c => c.id === community.id)
    ) : [];

  const { data: tasks, error: tasksError } = useQuery<TaskWithUser[]>({
    queryKey: ["/api/communities", selectedCommunity, "tasks"],
    enabled: !!selectedCommunity,
    retry: false,
  });

  useEffect(() => {
    if (tasksError && isUnauthorizedError(tasksError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [tasksError, toast]);

  useEffect(() => {
    if (communities && communities.length === 0) {
      setLocation("/communities");
    }
  }, [communities, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentCommunity = communities?.find(c => c.id === selectedCommunity);
  const isCreator = currentCommunity && user && currentCommunity.creatorId === user.id;

  const deleteCommunityMutation = useMutation({
    mutationFn: async (communityId: string) => {
      await apiRequest("DELETE", `/api/communities/${communityId}`);
    },
    onSuccess: (_, deletedCommunityId) => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      
      // 삭제된 공동체가 현재 선택된 공동체인 경우 다른 공동체로 전환
      if (selectedCommunity === deletedCommunityId) {
        const remainingCommunities = communities?.filter(c => c.id !== deletedCommunityId) || [];
        if (remainingCommunities.length > 0) {
          setSelectedCommunity(remainingCommunities[0].id);
        } else {
          setSelectedCommunity("");
        }
      }
      
      setShowDeleteConfirm(false);
      toast({
        title: "공동체 삭제 완료",
        description: "공동체가 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "공동체 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      {/* Header */}
      <header className="bg-card border-b border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <MapPin className="text-secondary-foreground text-sm" />
            </div>
            <div>
              <h1 className="font-bold text-lg">품앗이</h1>
              <p className="text-xs text-muted-foreground" data-testid="text-user-address">
                {user.firstName ? `${user.firstName}님` : "사용자"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={() => setLocation("/settings")}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Community Selection */}
        {communities && communities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">공동체 선택</Label>
              {isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="button-delete-community"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>
            <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
              <SelectTrigger className="w-full" data-testid="select-community">
                <SelectValue placeholder="공동체를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      {/* Task Feed */}
      <main className="pb-20 p-4">
        {!selectedCommunity ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">공동체를 선택해주세요</h3>
            <p className="text-sm text-muted-foreground mb-4">
              위에서 공동체를 선택하면 도움 요청을 볼 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">도움 요청</h2>
            
            {!tasks || tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">아직 요청이 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  첫 번째 도움 요청을 올려보세요!
                </p>
                <Button onClick={() => setLocation("/create-task")} data-testid="button-create-first-task">
                  요청 올리기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 새 요청 만들기 버튼 */}
                <Button 
                  className="w-full" 
                  onClick={() => setLocation("/create-task")}
                  data-testid="button-create-new-task"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  새 요청 만들기
                </Button>
                
                {tasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onTaskClick={(id) => setLocation(`/tasks/${id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button - 공동체가 선택되면 항상 표시 */}
      {selectedCommunity && (
        <Button
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg"
          onClick={() => setLocation("/create-task")}
          data-testid="button-create-task"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <MobileNav />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">공동체 삭제</h3>
            <p className="text-muted-foreground mb-6">
              정말로 <strong>{currentCommunity?.name}</strong> 공동체를 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없으며, 공동체와 관련된 모든 도움 요청, 메시지, 거래 내역이 삭제됩니다.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="button-cancel-delete"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => selectedCommunity && deleteCommunityMutation.mutate(selectedCommunity)}
                disabled={deleteCommunityMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteCommunityMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
