import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createCommunitySchema = z.object({
  name: z.string().min(1, "공동체 이름을 입력해주세요"),
  description: z.string().optional(),
  verificationMethod: z.string().min(1, "인증 방법을 선택해주세요"),
  verificationData: z.string().optional(),
  showRealNames: z.boolean().default(false),
  showAddresses: z.boolean().default(false),
});

type CreateCommunityForm = z.infer<typeof createCommunitySchema>;

export default function CreateCommunity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCommunityForm>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: "",
      description: "",
      verificationMethod: "",
      verificationData: "",
      showRealNames: false,
      showAddresses: false,
    },
  });

  const createCommunityMutation = useMutation({
    mutationFn: async (data: CreateCommunityForm) => {
      await apiRequest("POST", "/api/communities", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      toast({
        title: "공동체 생성 완료",
        description: "새로운 공동체가 성공적으로 만들어졌습니다.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "공동체 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCommunityForm) => {
    createCommunityMutation.mutate(data);
  };

  const verificationMethod = form.watch("verificationMethod");

  return (
    <>
      <header className="bg-card border-b border-border p-4 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/communities")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-bold flex-1">새 공동체 만들기</h2>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createCommunityMutation.isPending}
          data-testid="button-create"
        >
          {createCommunityMutation.isPending ? "생성 중..." : "완료"}
        </Button>
      </header>

      <form className="p-4 space-y-6">
        <div>
          <Label htmlFor="name">공동체 이름</Label>
          <Input
            id="name"
            placeholder="예: 서초동 아파트 주민"
            className="mt-2"
            {...form.register("name")}
            data-testid="input-name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">설명 (선택사항)</Label>
          <Textarea
            id="description"
            placeholder="공동체에 대한 간단한 설명을 입력해주세요..."
            rows={3}
            className="mt-2 resize-none"
            {...form.register("description")}
            data-testid="textarea-description"
          />
        </div>

        <div>
          <Label htmlFor="verificationMethod">가입 인증 방법</Label>
          <Select
            value={form.watch("verificationMethod")}
            onValueChange={(value) => form.setValue("verificationMethod", value)}
          >
            <SelectTrigger className="mt-2" data-testid="select-verification-method">
              <SelectValue placeholder="인증 방법 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="location">위치 인증</SelectItem>
              <SelectItem value="password">비밀번호 인증</SelectItem>
              <SelectItem value="photo">사진 인증</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.verificationMethod && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.verificationMethod.message}</p>
          )}
        </div>

        {verificationMethod === "password" && (
          <div>
            <Label htmlFor="verificationData">비밀번호</Label>
            <Input
              id="verificationData"
              type="password"
              placeholder="가입시 필요한 비밀번호를 설정해주세요"
              className="mt-2"
              {...form.register("verificationData")}
              data-testid="input-password"
            />
          </div>
        )}

        {verificationMethod === "photo" && (
          <div>
            <Label htmlFor="verificationData">사진 인증 안내</Label>
            <Textarea
              id="verificationData"
              placeholder="가입 희망자가 제출해야 할 사진에 대한 설명을 입력해주세요 (예: 아파트 입구 사진)"
              rows={3}
              className="mt-2 resize-none"
              {...form.register("verificationData")}
              data-testid="textarea-photo-guide"
            />
          </div>
        )}

        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-medium">거래 시 정보 공개</h3>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="showRealNames"
              checked={form.watch("showRealNames")}
              onCheckedChange={(checked) => form.setValue("showRealNames", !!checked)}
              data-testid="checkbox-show-real-names"
            />
            <Label htmlFor="showRealNames" className="text-sm">
              실명 공개 (거래시 상대방의 실명이 보입니다)
            </Label>
          </div>
          
          <div className="flex items-center space-x-3">
            <Checkbox
              id="showAddresses"
              checked={form.watch("showAddresses")}
              onCheckedChange={(checked) => form.setValue("showAddresses", !!checked)}
              data-testid="checkbox-show-addresses"
            />
            <Label htmlFor="showAddresses" className="text-sm">
              거주지 공개 (거래시 상대방의 주소가 보입니다)
            </Label>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">안내사항</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>위치 인증: GPS를 통해 해당 지역에 거주하는지 확인합니다</li>
            <li>비밀번호 인증: 설정한 비밀번호를 알아야만 가입할 수 있습니다</li>
            <li>사진 인증: 제출된 사진을 직접 검토한 후 승인해야 합니다</li>
          </ul>
        </div>
      </form>
    </>
  );
}