import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Registration from "@/pages/registration";
import CommunitySelection from "@/pages/community-selection";
import CreateCommunity from "@/pages/create-community";
import TaskDetail from "@/pages/task-detail";
import Chat from "@/pages/chat";
import Chats from "@/pages/chats";
import CreateTask from "@/pages/create-task";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/register" component={Registration} />
          <Route path="/communities" component={CommunitySelection} />
          <Route path="/create-community" component={CreateCommunity} />
          <Route path="/tasks/:id" component={TaskDetail} />
          <Route path="/tasks/:id/chat" component={Chat} />
          <Route path="/chats" component={Chats} />
          <Route path="/create-task" component={CreateTask} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-sm mx-auto bg-card min-h-screen relative overflow-hidden">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
