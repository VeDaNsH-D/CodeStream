import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Code, Zap, HelpCircle, MessageSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { File } from "@shared/schema";

interface AiAssistantProps {
  selectedFile: File | null;
  onClose: () => void;
}

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  codeExample?: string;
  timestamp: Date;
}

export default function AiAssistant({ selectedFile, onClose }: AiAssistantProps) {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI coding assistant. I can help you with code debugging, optimization, explanations, and best practices. What would you like help with today?",
      suggestions: [
        "Code debugging and optimization",
        "Algorithm explanations", 
        "Best practices and patterns",
        "Language-specific questions",
      ],
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();

  // AI assistance mutation
  const aiAssistanceMutation = useMutation({
    mutationFn: async (data: { question: string; code?: string; language?: string; context?: string }) => {
      const response = await apiRequest("POST", "/api/ai/assistance", data);
      return response.json();
    },
    onSuccess: (result) => {
      const assistantMessage: AiMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.response,
        suggestions: result.suggestions,
        codeExample: result.codeExample,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "AI assistance failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Debug code mutation
  const debugCodeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const response = await apiRequest("POST", "/api/ai/debug", {
        code: selectedFile.content,
        language: selectedFile.language,
      });
      return response.json();
    },
    onSuccess: (result) => {
      const assistantMessage: AiMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.response,
        suggestions: result.suggestions,
        codeExample: result.codeExample,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Debug failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Optimize code mutation
  const optimizeCodeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const response = await apiRequest("POST", "/api/ai/optimize", {
        code: selectedFile.content,
        language: selectedFile.language,
      });
      return response.json();
    },
    onSuccess: (result) => {
      const assistantMessage: AiMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.response,
        suggestions: result.suggestions,
        codeExample: result.codeExample,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Optimization failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Explain code mutation
  const explainCodeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      const response = await apiRequest("POST", "/api/ai/explain", {
        code: selectedFile.content,
        language: selectedFile.language,
      });
      return response.json();
    },
    onSuccess: (result) => {
      const assistantMessage: AiMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: result.response,
        suggestions: result.suggestions,
        codeExample: result.codeExample,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      toast({
        title: "Explanation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    aiAssistanceMutation.mutate({
      question: newMessage,
      code: selectedFile?.content || undefined,
      language: selectedFile?.language || undefined,
      context: selectedFile ? `Working on file: ${selectedFile.name}` : undefined,
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-editor-secondary rounded-lg w-[600px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-ai-assistant"
      >
        {/* AI Modal Header */}
        <div className="p-4 border-b border-editor-tertiary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-editor-text">AI Coding Assistant</h3>
                <p className="text-sm text-editor-text-dim">Get help with your code</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-editor-tertiary text-editor-text-dim hover:text-editor-text"
              data-testid="button-close-ai-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* AI Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin space-y-4 min-h-[300px]">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              data-testid={`message-${message.role}-${message.id}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
              )}
              
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-xs' : ''}`}>
                <div className={`rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-editor-accent text-white ml-auto' 
                    : 'bg-editor-tertiary text-editor-text'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.suggestions && message.suggestions.length > 0 && (
                    <ul className="text-sm mt-2 space-y-1 text-editor-text-dim">
                      {message.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  )}
                  
                  {message.codeExample && (
                    <div className="bg-editor-bg rounded p-2 font-mono text-xs overflow-x-auto mt-2">
                      <pre className="whitespace-pre-wrap">{message.codeExample}</pre>
                    </div>
                  )}
                </div>
                
                <div className={`text-xs text-editor-text-dim mt-1 ${
                  message.role === 'user' ? 'text-right' : ''
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-editor-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">U</span>
                </div>
              )}
            </div>
          ))}
          
          {(aiAssistanceMutation.isPending || debugCodeMutation.isPending || optimizeCodeMutation.isPending || explainCodeMutation.isPending) && (
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-robot text-white text-xs"></i>
              </div>
              <div className="flex-1">
                <div className="bg-editor-tertiary rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-editor-text">AI is thinking</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse"></div>
                      <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                      <div className="w-1 h-1 bg-editor-text-dim rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* AI Input */}
        <div className="p-4 border-t border-editor-tertiary">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Ask the AI assistant..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-editor-tertiary border-editor-tertiary text-editor-text placeholder:text-editor-text-dim focus:ring-purple-500 focus:border-transparent"
              data-testid="input-ai-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || aiAssistanceMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all transform hover:scale-105"
              data-testid="button-send-ai-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => debugCodeMutation.mutate()}
              disabled={!selectedFile || debugCodeMutation.isPending}
              className="bg-editor-tertiary hover:bg-editor-accent text-editor-text hover:text-white"
              data-testid="button-debug-code"
            >
              <Code className="mr-1 h-3 w-3" />
              Debug this code
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => explainCodeMutation.mutate()}
              disabled={!selectedFile || explainCodeMutation.isPending}
              className="bg-editor-tertiary hover:bg-editor-accent text-editor-text hover:text-white"
              data-testid="button-explain-algorithm"
            >
              <HelpCircle className="mr-1 h-3 w-3" />
              Explain algorithm
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => optimizeCodeMutation.mutate()}
              disabled={!selectedFile || optimizeCodeMutation.isPending}
              className="bg-editor-tertiary hover:bg-editor-accent text-editor-text hover:text-white"
              data-testid="button-optimize-performance"
            >
              <Zap className="mr-1 h-3 w-3" />
              Optimize performance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewMessage("Add detailed comments to this code")}
              className="bg-editor-tertiary hover:bg-editor-accent text-editor-text hover:text-white"
              data-testid="button-add-comments"
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Add comments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
