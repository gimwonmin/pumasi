import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const registrationSchema = z.object({
  phone: z.string().min(1, "전화번호를 입력해주세요"),
  address: z.string().min(1, "주소를 입력해주세요"),
  firstName: z.string().min(1, "이름을 입력해주세요"),
  lastName: z.string().optional(),
  agreePersonalInfo: z.boolean().refine(val => val, "개인정보 처리에 동의해주세요"),
  agreeLocation: z.boolean().refine(val => val, "위치정보 이용에 동의해주세요"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function Registration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      phone: "",
      address: "",
      firstName: "",
      lastName: "",
      agreePersonalInfo: false,
      agreeLocation: false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<RegistrationForm>) => {
      await apiRequest("PATCH", "/api/auth/user", data);
    },
    onSuccess: () => {
      toast({
        title: "회원가입 완료",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });
      setLocation("/communities");
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "프로필 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationForm) => {
    updateProfileMutation.mutate({
      phone: data.phone,
      address: data.address,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 p-0"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold mb-2">회원가입</h2>
        <div className="flex space-x-1 mb-6">
          <div className={`w-6 h-1 rounded ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`w-6 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`w-6 h-1 rounded ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
          <div className={`w-6 h-1 rounded ${step >= 4 ? 'bg-primary' : 'bg-muted'}`}></div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="phone">전화번호</Label>
          <div className="flex space-x-2 mt-2">
            <Input
              id="phone"
              placeholder="010-1234-5678"
              {...form.register("phone")}
              data-testid="input-phone"
            />
            <Button type="button" variant="outline" size="sm" data-testid="button-verify-phone">
              인증
            </Button>
          </div>
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="firstName">이름</Label>
          <Input
            id="firstName"
            placeholder="홍길동"
            className="mt-2"
            {...form.register("firstName")}
            data-testid="input-first-name"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.firstName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            placeholder="서울시 강남구 역삼동..."
            className="mt-2"
            {...form.register("address")}
            data-testid="input-address"
          />
          <Button 
            type="button" 
            variant="link" 
            size="sm" 
            className="mt-2 p-0 h-auto"
            data-testid="button-current-location"
          >
            <MapPin className="h-4 w-4 mr-2" />
            현재 위치로 설정
          </Button>
          {form.formState.errors.address && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.address.message}</p>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agreePersonalInfo"
              checked={form.watch("agreePersonalInfo")}
              onCheckedChange={(checked) => form.setValue("agreePersonalInfo", !!checked)}
              data-testid="checkbox-agree-personal-info"
            />
            <Label htmlFor="agreePersonalInfo" className="text-sm">
              개인정보 수집 및 이용에 동의합니다 <span className="text-primary">[필수]</span>
            </Label>
          </div>
          {form.formState.errors.agreePersonalInfo && (
            <p className="text-sm text-destructive">{form.formState.errors.agreePersonalInfo.message}</p>
          )}
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="agreeLocation"
              checked={form.watch("agreeLocation")}
              onCheckedChange={(checked) => form.setValue("agreeLocation", !!checked)}
              data-testid="checkbox-agree-location"
            />
            <Label htmlFor="agreeLocation" className="text-sm">
              위치 정보 이용에 동의합니다 <span className="text-primary">[필수]</span>
            </Label>
          </div>
          {form.formState.errors.agreeLocation && (
            <p className="text-sm text-destructive">{form.formState.errors.agreeLocation.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full mt-8"
          disabled={updateProfileMutation.isPending}
          data-testid="button-complete-registration"
        >
          {updateProfileMutation.isPending ? "처리 중..." : "완료"}
        </Button>
      </form>
    </div>
  );
}
