import { Button } from "@/components/ui/button";
import { HandHeart } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
          <HandHeart className="text-primary text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground mb-2">품앗이</h1>
        <p className="text-primary-foreground/80 text-sm mb-8">우리 동네 도움 네트워크</p>
        
        <Button 
          onClick={() => window.location.href = '/api/login'}
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          data-testid="button-login"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}
