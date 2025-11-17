interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    messageType: string | null;
    createdAt: string | Date | null;
    sender: {
      firstName?: string | null;
      email?: string | null;
    };
  };
  isOwnMessage: boolean;
}

export default function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const senderInitial = message.sender.firstName?.[0] || message.sender.email?.[0] || "?";
  const messageTime = message.createdAt ? new Date(message.createdAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  if (message.messageType === 'system') {
    return (
      <div className="text-center">
        <div className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs" data-testid={`message-system-${message.id}`}>
          {message.content}
        </div>
      </div>
    );
  }

  if (isOwnMessage) {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs">
          <div className="bg-primary text-primary-foreground rounded-lg p-3">
            <p className="text-sm" data-testid={`message-content-${message.id}`}>
              {message.content}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right" data-testid={`message-time-${message.id}`}>
            {messageTime}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-xs" data-testid={`message-sender-initial-${message.id}`}>
          {senderInitial}
        </span>
      </div>
      <div className="flex-1">
        <div className="bg-card border border-border rounded-lg p-3 max-w-xs">
          <p className="text-sm" data-testid={`message-content-${message.id}`}>
            {message.content}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1" data-testid={`message-time-${message.id}`}>
          {messageTime}
        </p>
      </div>
    </div>
  );
}
