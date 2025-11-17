import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Community } from "@shared/schema";

const createTaskSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(1, "설명을 입력해주세요"),
  category: z.string().min(1, "카테고리를 선택해주세요"),
  reward: z.string().min(1, "보수를 입력해주세요"),
  timeEstimate: z.string().optional(),
  location: z.string().optional(),
  communityId: z.string().min(1, "커뮤니티를 선택해주세요"),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

const categories = [
  "장보기",
  "택배 수령",
  "반려동물 돌봄",
  "청소",
  "이사",
  "운전",
  "기타"
];

export default function CreateTask() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: communities } = useQuery<Community[]>({
    queryKey: ["/api/user/communities"],
  });

  const form = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      reward: "",
      timeEstimate: "",
      location: "",
      communityId: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskForm) => {
      await apiRequest("POST", "/api/tasks", {
        ...data,
        reward: data.reward,
      });
    },
    onSuccess: () => {
      // 관련된 모든 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      // 모든 커뮤니티의 tasks 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/communities"], exact: false });
      
      toast({
        title: "작업 등록 완료",
        description: "도움 요청이 성공적으로 등록되었습니다.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "작업 등록에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTaskForm) => {
    createTaskMutation.mutate(data);
  };

  return (
    <>
      <header className="bg-card border-b border-border p-4 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          data-testid="button-close"
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="font-bold flex-1">도움 요청하기</h2>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createTaskMutation.isPending}
          data-testid="button-publish"
        >
          {createTaskMutation.isPending ? "등록 중..." : "올리기"}
        </Button>
      </header>

      <form className="p-4 space-y-6">
        <div>
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            placeholder="도움이 필요한 일을 간단히 설명해주세요"
            className="mt-2"
            {...form.register("title")}
            data-testid="input-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">상세 설명</Label>
          <Textarea
            id="description"
            placeholder="구체적인 내용을 작성해주세요..."
            rows={4}
            className="mt-2 resize-none"
            {...form.register("description")}
            data-testid="textarea-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">카테고리</Label>
          <Select
            value={form.watch("category")}
            onValueChange={(value) => form.setValue("category", value)}
          >
            <SelectTrigger className="mt-2" data-testid="select-category">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeEstimate">예상 시간</Label>
            <Input
              id="timeEstimate"
              placeholder="30분"
              className="mt-2"
              {...form.register("timeEstimate")}
              data-testid="input-time-estimate"
            />
          </div>
          <div>
            <Label htmlFor="reward">보수 (원)</Label>
            <Input
              id="reward"
              type="number"
              placeholder="15000"
              className="mt-2"
              {...form.register("reward")}
              data-testid="input-reward"
            />
            {form.formState.errors.reward && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.reward.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="location">위치</Label>
          <div className="flex space-x-2 mt-2">
            <Input
              id="location"
              placeholder="상세 위치 입력"
              className="flex-1"
              {...form.register("location")}
              data-testid="input-location"
            />
            <Button type="button" variant="outline" size="sm" data-testid="button-current-location">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="communityId">커뮤니티</Label>
          <Select
            value={form.watch("communityId")}
            onValueChange={(value) => form.setValue("communityId", value)}
          >
            <SelectTrigger className="mt-2" data-testid="select-community">
              <SelectValue placeholder="커뮤니티 선택" />
            </SelectTrigger>
            <SelectContent>
              {communities?.map((community) => (
                <SelectItem key={community.id} value={community.id}>
                  {community.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.communityId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.communityId.message}</p>
          )}
        </div>
      </form>
    </>
  );
}
