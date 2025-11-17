import { Star, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import type { TaskWithUser } from "@/lib/queryClient";

interface TaskCardProps {
  task: TaskWithUser;
  onTaskClick: (id: string) => void;
}

export default function TaskCard({ task, onTaskClick }: TaskCardProps) {
  const authorInitial = task.author.firstName?.[0] || task.author.email?.[0] || "?";
  const authorName = task.author.firstName ? `${task.author.firstName}**님` : "익명";
  const timeAgo = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '날짜 미상';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onTaskClick(task.id)}
      data-testid={`card-task-${task.id}`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs font-medium" data-testid={`text-author-initial-${task.id}`}>
                {authorInitial}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm" data-testid={`text-author-name-${task.id}`}>
                {authorName}
              </p>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-accent fill-current" />
                <span className="text-xs text-muted-foreground" data-testid={`text-author-rating-${task.id}`}>
                  {task.author.rating || "0.0"} ({task.author.completedTasks || 0})
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-accent" data-testid={`text-task-reward-${task.id}`}>
              {parseInt(task.reward).toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`text-task-time-${task.id}`}>
              {timeAgo}
            </p>
          </div>
        </div>
        
        <h3 className="font-medium mb-2" data-testid={`text-task-title-${task.id}`}>
          {task.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-task-description-${task.id}`}>
          {task.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            {task.location && (
              <span className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span data-testid={`text-task-location-${task.id}`}>{task.location}</span>
              </span>
            )}
            
            {task.timeEstimate && (
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span data-testid={`text-task-time-estimate-${task.id}`}>{task.timeEstimate}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span 
              className="bg-primary text-primary-foreground px-2 py-1 rounded-full"
              data-testid={`text-task-category-${task.id}`}
            >
              {task.category}
            </span>
            
            <span 
              className={`px-2 py-1 rounded-full text-xs ${
                task.status === 'open' ? 'bg-primary text-primary-foreground' :
                task.status === 'accepted' ? 'bg-secondary text-secondary-foreground' :
                task.status === 'in_progress' ? 'bg-accent text-accent-foreground' :
                task.status === 'cancelled' ? 'bg-destructive text-destructive-foreground' :
                'bg-muted-foreground text-muted'
              }`}
              data-testid={`text-task-status-${task.id}`}
            >
              {task.status === 'open' ? '요청 중' :
               task.status === 'accepted' ? '수락됨' :
               task.status === 'in_progress' ? '진행 중' :
               task.status === 'completed' ? '완료' :
               task.status === 'cancelled' ? '취소됨' : '요청 중'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
