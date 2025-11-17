import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HandHeart, Settings, MessageCircle } from "lucide-react";
import { useChatNotifications } from "@/hooks/useChatNotifications";

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const { unreadCount } = useChatNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        <Button
          variant="ghost"
          className={`flex flex-col items-center py-2 px-4 ${
            location === "/" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setLocation("/")}
          data-testid="nav-tasks"
        >
          <HandHeart className="h-5 w-5 mb-1" />
          <span className="text-xs">품앗이</span>
        </Button>
        <Button
          variant="ghost"
          className={`flex flex-col items-center py-2 px-4 relative ${
            location === "/chats" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setLocation("/chats")}
          data-testid="nav-chats"
        >
          <div className="relative">
            <MessageCircle className="h-5 w-5 mb-1" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs">채팅</span>
        </Button>
        <Button
          variant="ghost"
          className={`flex flex-col items-center py-2 px-4 ${
            location === "/settings" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => setLocation("/settings")}
          data-testid="nav-settings"
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-xs">설정</span>
        </Button>
      </div>
    </nav>
  );
}
