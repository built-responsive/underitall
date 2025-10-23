import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(
    localStorage.getItem("chatConversationId")
  );
  const [sessionId] = useState(() => {
    let id = localStorage.getItem("chatSessionId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("chatSessionId", id);
    }
    return id;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch existing conversation
  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/chat/conversation/session", sessionId],
    enabled: !!sessionId,
  });

  const conversation = conversations?.[0] || null;

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat/message", {
        content,
        conversationId,
        sessionId,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      // Check if response has the expected structure
      if (!data || !data.userMessage || !data.assistantMessage) {
        console.error("Invalid API response structure:", data);
        return;
      }

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.userMessage.id || `user_${Date.now()}`,
          role: "user",
          content: data.userMessage.content,
          createdAt: data.userMessage.createdAt,
        },
        {
          id: data.assistantMessage.id || `assistant_${Date.now()}`,
          role: "assistant",
          content: data.assistantMessage.content,
          createdAt: data.assistantMessage.createdAt,
        },
      ]);
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      // Optionally show error message to user
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!inputValue.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(inputValue);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (conversation?.id) {
      setConversationId(conversation.id);
      localStorage.setItem("chatConversationId", conversation.id);
    }
  }, [conversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="h-16 w-16 rounded-full shadow-lg font-['Archivo']"
          style={{
            backgroundColor: '#F2633A',
            color: 'white',
            borderRadius: '50%'
          }}
          onClick={() => setIsOpen(true)}
          data-testid="button-open-chat"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="shadow-2xl" style={{ borderRadius: '16px' }}>
        <CardHeader
          className="text-white rounded-t-lg py-4"
          style={{ backgroundColor: '#F2633A', borderRadius: '16px 16px 0 0' }}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-['Archivo']">
              UnderItAll Assistant
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
                data-testid="button-minimize-chat"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                  setConversationId(null);
                  localStorage.removeItem("chatConversationId");
                }}
                data-testid="button-close-chat"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] p-4" ref={scrollRef} data-testid="chat-messages">
            {messages.length === 0 ? (
              <div className="text-center py-12 font-['Vazirmatn']" style={{ color: '#696A6D' }}>
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: '#F2633A' }} />
                <p>Hi! I'm here to help you find the perfect rug pad.</p>
                <p className="text-sm mt-2">Ask me about sizing, pricing, or our wholesale program!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                    data-testid={`message-${message.role}`}
                  >
                    <div
                      className="max-w-[80%] px-4 py-2 font-['Vazirmatn']"
                      style={{
                        backgroundColor: message.role === "user" ? '#F2633A' : '#E1E0DA',
                        color: message.role === "user" ? 'white' : '#212227',
                        borderRadius: '11px'
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start" data-testid="message-loading">
                    <div className="px-4 py-2 font-['Vazirmatn']" style={{ backgroundColor: '#E1E0DA', borderRadius: '11px' }}>
                      <p className="text-sm" style={{ color: '#696A6D' }}>Typing...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about rug pads..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendMessageMutation.isPending}
                className="font-['Vazirmatn']"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
                className="font-['Archivo']"
                style={{
                  backgroundColor: '#F2633A',
                  color: 'white',
                  borderRadius: '11px'
                }}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}