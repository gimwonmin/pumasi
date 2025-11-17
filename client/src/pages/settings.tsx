import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, CreditCard, History, Bell, Shield, HelpCircle } from "lucide-react";
import type { User } from "@shared/schema";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const menuItems = [
    {
      icon: Users,
      label: "참여 중인 공동체",
      href: "/communities",
    },
    {
      icon: CreditCard,
      label: "계좌 관리",
      href: "/account",
    },
    {
      icon: History,
      label: "거래 내역",
      href: "/transactions",
    },
    {
      icon: Bell,
      label: "알림 설정",
      href: "/notifications",
    },
    {
      icon: Shield,
      label: "개인정보 보호",
      href: "/privacy",
    },
    {
      icon: HelpCircle,
      label: "고객센터",
      href: "/help",
    },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

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
        <h2 className="font-bold flex-1">설정</h2>
      </header>

      <div className="p-4">
        {/* Profile Section */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <span className="text-lg font-medium" data-testid="text-user-initial">
                {user?.firstName?.[0] || user?.email?.[0] || "?"}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg" data-testid="text-user-name">
                {user?.firstName ? `${user.firstName}**님` : "사용자"}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="flex items-center">
                  ⭐ <span className="ml-1" data-testid="text-user-rating">
                    {user?.rating || "0.0"} ({user?.completedTasks || 0})
                  </span>
                </span>
                <span>·</span>
                <span data-testid="text-user-completed">
                  완료 {user?.completedTasks || 0}건
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-2 bg-muted rounded">
              <p className="font-bold text-primary" data-testid="text-help-given">
                {user?.helpGiven || 0}
              </p>
              <p className="text-muted-foreground">도움 제공</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="font-bold text-accent" data-testid="text-help-received">
                {user?.helpReceived || 0}
              </p>
              <p className="text-muted-foreground">도움 받음</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className="w-full justify-start h-auto p-4 bg-card border border-border rounded-lg hover:bg-muted"
              onClick={() => setLocation(item.href)}
              data-testid={`button-${item.href.slice(1)}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <item.icon className="h-5 w-5 text-primary" />
                  <span>{item.label}</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
              </div>
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full mt-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          로그아웃
        </Button>
      </div>
    </>
  );
}
