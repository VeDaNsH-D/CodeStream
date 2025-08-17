import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Video, Mic, Monitor } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

interface ChatPanelProps {
  projectId: string;
  onClose: () => void;
}

interface MessageWithAuthor extends ChatMessage {
  author?: {
    username: string;
    avatar?: string | null;
  };
}

export default function ChatPanel({ projectId, onClose }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch chat messages
  const { data: messages = [] } = useQuery<MessageWithAuthor[]>({
    queryKey: ["/api/projects", projectId, "messages"],
    enabled: !!projectId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; projectId: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "messages"] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !projectId) return;
    
    sendMessageMutation.mutate({
      content: newMessage,
      projectId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUserInitials = (username: string) => {
    return username
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (username: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500", 
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
    ];
    const index = username.length % colors.length;
    return colors[index];
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-3 border-b border-editor-tertiary">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-editor-text">TEAM CHAT</span>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              data-testid="button-video-call"
            >
              <Video className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              data-testid="button-voice-call"
            >
              <Mic className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              onClick={onClose}
              data-testid="button-close-chat"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-editor-text-dim py-8">
            <i className="fas fa-comments text-2xl mb-2"></i>
            <p>No messages yet</p>
            <p className="text-xs">Start a conversation with your team</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex space-x-3" data-testid={`message-${message.id}`}>
              <div 
                className={`w-8 h-8 ${getUserColor(message.author?.username || "User")} rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}
              >
                {getUserInitials(message.author?.username || "U")}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-editor-text">
                    {message.author?.username || "Unknown User"}
                  </span>
                  <span className="text-xs text-editor-text-dim">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <div className="text-sm mt-1 text-editor-text">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex space-x-3 opacity-60">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              AS
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-editor-text">Alice is typing</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-editor-tertiary">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-editor-tertiary border-editor-tertiary text-editor-text placeholder:text-editor-text-dim focus:ring-editor-accent focus:border-transparent"
            data-testid="input-chat-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-editor-accent hover:bg-blue-600 text-white"
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Voice/Video Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              title="Start Voice Call"
              data-testid="button-start-voice"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              title="Start Video Call"
              data-testid="button-start-video"
            >
              <Video className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              title="Share Screen"
              data-testid="button-share-screen"
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-editor-text-dim">3 online</div>
        </div>
      </div>
    </div>
  );
}
