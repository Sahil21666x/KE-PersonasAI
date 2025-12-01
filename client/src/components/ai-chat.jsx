import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Mic, Square, Send, Paperclip, Phone, Video, MoreVertical, 
  ChevronDown, ChevronUp, Plus, X, Menu
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// Hook to fetch all agents (default + custom)
const useAllAgents = () => {
  const { user } = useAuth();
  const { data: agentsData = {} } = useQuery({
    queryKey: ['api/agents'],
    enabled: !!user,
  });

  return agentsData.agents || [];
};

export default function AiChat({ 
  currentConversationId, 
  activeAgents = [], 
  conversationType = "single",
  onNewConversation,
  onToggleSidebar,
  isMobile = false
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all agents (default + custom)
  const ALL_AGENTS = useAllAgents();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [typingAgents, setTypingAgents] = useState([]);
  const [showActiveAgents, setShowActiveAgents] = useState(true);
  const [localActiveAgents, setLocalActiveAgents] = useState([]);
  const [showAddAgents, setShowAddAgents] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sync active agents with props - FIXED: Better sync logic
  useEffect(() => {
    setLocalActiveAgents(activeAgents);
  }, [activeAgents]);

  // Get currently active agents from ALL_AGENTS (including custom)
  const currentAgents = ALL_AGENTS.filter(agent => localActiveAgents.includes(agent.id));
  const availableAgents = ALL_AGENTS.filter(agent => !localActiveAgents.includes(agent.id));

  // Fetch conversation history to get titles
  const { data: conversationsData = {} } = useQuery({
    queryKey: ['api/conversations/history'],
    enabled: !!user,
  });

  const conversations = conversationsData.conversations || [];

  // Load conversation messages when a conversation is selected - FIXED: Only fetch when we have a conversation ID
  const { data: conversationMessagesData = {} } = useQuery({
    queryKey: ['api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  // Extract messages array from the response
  const conversationMessages = conversationMessagesData.messages || [];

  // FIXED: Clear messages when switching to a new conversation without ID
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
    }
  }, [currentConversationId]);

  // FIXED: Load messages when conversationMessages change
  useEffect(() => {
    if (currentConversationId && conversationMessages.length > 0) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages, currentConversationId]);

  // FIXED: Show welcome message when agents change for new conversations
  useEffect(() => {
    if (!currentConversationId && localActiveAgents.length > 0 && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          type: "system",
          content: `Welcome! You're now chatting with ${localActiveAgents.length} AI agent${localActiveAgents.length > 1 ? 's' : ''}. Each has their own personality and will share opinions when they want to. 👋`,
          timestamp: new Date()
        }
      ]);
    }
  }, [localActiveAgents, currentConversationId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAgents]);

  // Get current conversation title
  const getConversationTitle = () => {
    if (!currentConversationId) {
      return conversationType === "group" 
        ? `Group Chat (${localActiveAgents.length})` 
        : currentAgents[0]?.name || "New Chat";
    }
    
    // Get title from conversations list
    const conversation = conversations.find(c => c.id === currentConversationId);
    return conversation?.title || "AI Chat";
  };

  // Voice recognition
  const startListening = () => {
    const SpeechRecognition = window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start voice recognition",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // API mutation for agent chat - updated to use current agents
  const agentChatMutation = useMutation({
    mutationFn: async (message) => {
      const res = await apiRequest("POST", "/api/conversations", {
        message: message,
        conversationType: localActiveAgents.length > 1 ? "group" : "single",
        activeAgents: localActiveAgents, // Send only selected agents
        conversationId: currentConversationId
      });
      return res;
    },
    onSuccess: (data) => {
      // Refresh conversation history
      queryClient.invalidateQueries(['/api/conversations/history']);

      if (data.agents && data.agents.length > 0) {
        // Add each agent's response as a separate message
        data.agents.forEach((agent, index) => {
          setTimeout(() => {
            // Find agent in ALL_AGENTS (including custom)
            const agentInfo = ALL_AGENTS.find(a => a.id === agent.agentId);
            setMessages(prev => [...prev, {
              id: `agent-${Date.now()}-${index}`,
              type: "agent",
              agent: agentInfo || {
                id: agent.agentId,
                name: agent.agentName,
                avatar: agent.avatar,
                color: agentInfo?.color || "bg-gray-500",
                personality: agent.personality
              },
              content: agent.response,
              timestamp: new Date(agent.timestamp)
            }]);

            // Remove from typing
            setTypingAgents(prev => prev.filter(id => id !== agent.agentId));
          }, index * 800);
        });
      }

      setTimeout(() => setTypingAgents([]), (data.agents?.length || 0) * 800 + 500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get agent responses",
        variant: "destructive"
      });
      setTypingAgents([]);
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || agentChatMutation.isPending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Get agent opinions - only from active agents
    setTypingAgents(localActiveAgents);
    agentChatMutation.mutate(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start new conversation - FIXED: Clear messages properly
  const startNewConversation = () => {
    setMessages([]); // Clear messages immediately
    if (onNewConversation) {
      onNewConversation([ALL_AGENTS[0]?.id || "creative"]);
    } else {
      setLocalActiveAgents([ALL_AGENTS[0]?.id || "creative"]);
    }
  };

  // Add agent to chat
  const addAgent = (agentId) => {
    if (!localActiveAgents.includes(agentId)) {
      const newActiveAgents = [...localActiveAgents, agentId];
      setLocalActiveAgents(newActiveAgents);
      
      // Find agent in ALL_AGENTS (including custom)
      const agent = ALL_AGENTS.find(a => a.id === agentId);
      toast({
        title: "Agent added",
        description: `${agent?.name || 'Unknown Agent'} has joined the chat`,
      });
    }
    setShowAddAgents(false);
  };

  // Remove agent from chat
  const removeAgent = (agentId) => {
    if (localActiveAgents.length > 1) {
      const newActiveAgents = localActiveAgents.filter(id => id !== agentId);
      setLocalActiveAgents(newActiveAgents);
      
      // Find agent in ALL_AGENTS (including custom)
      const agent = ALL_AGENTS.find(a => a.id === agentId);
      toast({
        title: "Agent removed",
        description: `${agent?.name || 'Unknown Agent'} has left the chat`,
      });
    } else {
      toast({
        title: "Cannot remove",
        description: "You need at least one agent in the chat",
        variant: "destructive"
      });
    }
  };

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isLoading = agentChatMutation.isPending;

  return (
    <div className="flex h-full w-full bg-[#0a0a0a]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* WhatsApp Header */}
        <div className="bg-[#1f2c33] text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            {/* Hamburger menu for mobile */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="text-white hover:bg-white/10 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex -space-x-2">
              {currentAgents.slice(0, 3).map(agent => (
                <div
                  key={agent.id}
                  className={`w-8 h-8 md:w-10 md:h-10 ${agent.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-sm md:text-lg border-2 border-[#1f2c33]`}
                >
                  {agent.avatar}
                </div>
              ))}
              {currentAgents.length > 3 && (
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-600 rounded-full flex items-center justify-center text-xs md:text-sm border-2 border-[#1f2c33]">
                  +{currentAgents.length - 3}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm md:text-base truncate">
                {getConversationTitle()}
              </h2>
              <p className="text-xs text-gray-400 truncate">
                {typingAgents.length > 0
                  ? `${typingAgents.length} agent${typingAgents.length > 1 ? 's' : ''} typing...`
                  : `${currentAgents.length} agent${currentAgents.length > 1 ? 's' : ''} selected`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 md:space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewConversation}
              className="text-gray-400 hover:text-white text-xs hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">New Chat</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex">
              <Video className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hidden sm:flex">
              <Phone className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        {/* Agent Preview Bar */}
        {showActiveAgents && currentAgents.length > 0 && (
          <div className="bg-[#1f2c33] px-3 md:px-4 py-2 border-t border-gray-700">
            <div className="flex items-center space-x-2 md:space-x-3 overflow-x-auto">
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">Active Agents:</span>
              <div className="flex space-x-2 overflow-x-auto md:overflow-x-hidden pb-1">
                {currentAgents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center space-x-2 bg-[#0b141a] px-2 md:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 relative group"
                  >
                    <div className={`w-5 h-5 md:w-6 md:h-6 ${agent.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-xs`}>
                      {agent.avatar}
                    </div>
                    <span className="text-xs text-white hidden sm:block">{agent.name}</span>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>

                    {/* Remove button on hover */}
                    <button
                      onClick={() => removeAgent(agent.id)}
                      className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <X className="h-2 w-2 md:h-3 md:w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Agents Dropdown */}
        {showAddAgents && (
          <div className="bg-[#1f2c33] border-t border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Add Agents to Chat:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddAgents(false)}
                className="text-gray-400 hover:text-white h-6 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableAgents.map(agent => (
                <Button
                  key={agent.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addAgent(agent.id)}
                  className="bg-[#0b141a] border-gray-600 text-white hover:bg-gray-700 text-xs h-8 flex items-center"
                >
                  <div className={`w-4 h-4 ${agent.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-xs mr-2`}>
                    {agent.avatar}
                  </div>
                  <span className="hidden sm:inline">{agent.name}</span>
                  <Plus className="h-3 w-3 ml-1" />
                </Button>
              ))}
              {availableAgents.length === 0 && (
                <span className="text-xs text-gray-400">All agents are already in the chat</span>
              )}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div
          className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#0b141a'
          }}
        >
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === "system" && (
                <div className="flex justify-center my-3 md:my-4">
                  <div className="bg-[#1f2c33] text-gray-300 text-xs px-3 py-2 md:px-4 md:py-2 rounded-lg max-w-xs md:max-w-md text-center">
                    {message.content}
                  </div>
                </div>
              )}

              {message.type === "user" && (
                <div className="flex justify-end mb-2">
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div className="bg-[#005c4b] text-white rounded-lg px-3 py-2 md:px-4 md:py-2 shadow-md">
                      <p className="text-sm break-words">{message.content}</p>
                      <p className="text-xs text-gray-300 mt-1 text-right">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {message.type === "agent" && (
                <div className="flex justify-start mb-2">
                  <div className="max-w-[85%] md:max-w-[75%] flex items-start space-x-2">
                    <div className={`w-7 h-7 md:w-8 md:h-8 ${message.agent?.color || 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <span className="text-sm">{message.agent?.avatar || '🤖'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#1f2c33] text-white rounded-lg px-3 py-2 md:px-4 md:py-2 shadow-md">
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                          {message.agent?.name || 'Unknown Agent'}
                          {message.agent?.isCustom && (
                            <Badge variant="outline" className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-400">
                              Custom
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm break-words">{message.content}</p>
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicators */}
          {typingAgents.length > 0 && (
            <div className="flex justify-start mb-2">
              <div className="flex items-start space-x-2">
                <div className="flex -space-x-2">
                  {typingAgents.slice(0, 3).map(agentId => {
                    const agent = ALL_AGENTS.find(a => a.id === agentId);
                    return agent ? (
                      <div
                        key={agentId}
                        className={`w-5 h-5 md:w-6 md:h-6 ${agent.color || 'bg-gray-500'} rounded-full flex items-center justify-center border-2 border-[#0b141a] shadow-md`}
                      >
                        <span className="text-xs">{agent.avatar}</span>
                      </div>
                    ) : null;
                  })}
                  {typingAgents.length > 3 && (
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-gray-600 rounded-full flex items-center justify-center border-2 border-[#0b141a] text-xs text-white">
                      +{typingAgents.length - 3}
                    </div>
                  )}
                </div>
                <div className="bg-[#1f2c33] text-white rounded-lg px-3 py-2 md:px-4 md:py-3 shadow-md">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Toggle buttons at the bottom only */}
        <div className="bg-[#1f2c33] border-t border-gray-700">
          <div className="flex justify-center space-x-4 px-3 md:px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActiveAgents(!showActiveAgents)}
              className="text-gray-400 hover:text-white text-xs"
            >
              {showActiveAgents ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              <span className="hidden sm:inline">
                {showActiveAgents ? "Hide Agents" : "Show Agents"}
              </span>
            </Button>
            
            {/* Mobile-only new chat button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="text-gray-400 hover:text-white text-xs sm:hidden"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Chat
              </Button>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-[#1f2c33] px-3 md:px-4 py-3 border-t border-gray-700">
          <div className="flex items-end space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:bg-white/10 flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
            >
              <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            <div className="flex-1 bg-[#2a3942] rounded-lg px-3 md:px-4 py-2 flex items-center min-h-[40px] md:min-h-[44px]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the agents anything..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500 w-full"
                disabled={isLoading}
              />
            </div>

            {/* Add Agents Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddAgents(!showAddAgents)}
              className={`flex-shrink-0 text-gray-400 hover:bg-white/10 h-9 w-9 md:h-10 md:w-10 ${showAddAgents ? 'bg-white/20' : ''}`}
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {inputValue.trim() ? (
              <Button
                onClick={handleSendMessage}
                disabled={isLoading}
                size="icon"
                className="bg-[#00a884] hover:bg-[#00a884]/90 rounded-full flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
              >
                {isLoading ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={isListening ? stopListening : startListening}
                className={`flex-shrink-0 ${isListening ? 'text-red-400' : 'text-gray-400'} hover:bg-white/10 h-9 w-9 md:h-10 md:w-10`}
              >
                {isListening ? <Square className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Chat with {currentAgents.length} AI agent{currentAgents.length > 1 ? 's' : ''} - they'll share their unique perspectives
          </p>
        </div>
      </div>
    </div>
  );
}