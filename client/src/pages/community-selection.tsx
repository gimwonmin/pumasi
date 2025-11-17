import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building, Users, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Community } from "@shared/schema";

export default function CommunitySelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: communitiesData } = useQuery<Community[]>({
    queryKey: ["/api/communities"],
  });

  const { data: userCommunitiesData } = useQuery<Community[]>({
    queryKey: ["/api/user/communities"],
  });

  // 중복 제거를 위한 고유한 공동체 목록 생성
  const allCommunities = communitiesData ? 
    communitiesData.filter((community, index, self) => 
      index === self.findIndex(c => c.id === community.id)
    ) : [];

  // 사용자가 가입한 공동체 ID 목록
  const userCommunityIds = userCommunitiesData?.map(c => c.id) || [];

  // 가입 여부 확인 함수
  const isUserMember = (communityId: string) => userCommunityIds.includes(communityId);

  const joinCommunityMutation = useMutation({
    mutationFn: async (communityId: string) => {
      await apiRequest("POST", `/api/communities/${communityId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      toast({
        title: "가입 완료",
        description: "커뮤니티에 성공적으로 가입했습니다.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "커뮤니티 가입에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredCommunities = allCommunities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const defaultCommunity = filteredCommunities.find(c => c.name.includes("동"));
  const joinedCommunities = filteredCommunities.filter(c => !c.name.includes("동") && isUserMember(c.id));
  const notJoinedCommunities = filteredCommunities.filter(c => !c.name.includes("동") && !isUserMember(c.id));

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">공동체 참가하기</h2>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="공동체 이름 검색"
            className="pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-community"
          />
        </div>
      </div>

      {/* Default Community */}
      {defaultCommunity && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">기본 공동체</h3>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <Building className="text-secondary-foreground h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium" data-testid="text-default-community-name">
                    {defaultCommunity.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    위치 인증 · {defaultCommunity.memberCount || 0}명
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (isUserMember(defaultCommunity.id)) {
                    setLocation("/");
                  } else {
                    joinCommunityMutation.mutate(defaultCommunity.id);
                  }
                }}
                disabled={joinCommunityMutation.isPending}
                data-testid="button-join-default-community"
              >
                {joinCommunityMutation.isPending ? "가입 중..." : isUserMember(defaultCommunity.id) ? "참가하기" : "가입하기"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Joined Communities */}
      {joinedCommunities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">가입된 공동체</h3>
          <div className="space-y-3">
            {joinedCommunities.map((community) => (
              <div key={community.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      <Users className="text-accent-foreground h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium" data-testid={`text-community-name-${community.id}`}>
                        {community.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {community.verificationMethod === 'photo' ? '사진 인증' : 
                         community.verificationMethod === 'password' ? '비밀번호 인증' : '위치 인증'} · {community.memberCount || 0}명
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/")}
                    data-testid={`button-join-community-${community.id}`}
                  >
                    참가하기
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Joined Communities */}
      {notJoinedCommunities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">새로운 공동체</h3>
          <div className="space-y-3">
            {notJoinedCommunities.map((community) => (
              <div key={community.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      <Users className="text-accent-foreground h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium" data-testid={`text-community-name-${community.id}`}>
                        {community.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {community.verificationMethod === 'photo' ? '사진 인증' : 
                         community.verificationMethod === 'password' ? '비밀번호 인증' : '위치 인증'} · {community.memberCount || 0}명
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => joinCommunityMutation.mutate(community.id)}
                    disabled={joinCommunityMutation.isPending}
                    data-testid={`button-join-community-${community.id}`}
                  >
                    {joinCommunityMutation.isPending ? "가입 중..." : "가입하기"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredCommunities.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">검색 결과가 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">
            새로운 공동체를 만들어보세요!
          </p>
        </div>
      )}

      {/* Create Community Button */}
      <Button
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        onClick={() => setLocation("/create-community")}
        data-testid="button-create-community"
      >
        <Plus className="h-4 w-4 mr-2" />
        새 공동체 만들기
      </Button>
    </div>
  );
}
