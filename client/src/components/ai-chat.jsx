import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic, Square, Send, Paperclip, Phone, Video, MoreVertical, ArrowLeft, Sparkles, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// AI Agents configuration (matching backend)
const ALL_AGENTS = [
  {
    id: "creative",
    name: "Creative Spark",
    avatar: "🎨",
    color: "bg-purple-500",
    personality: "Creative and innovative"
  },
  {
    id: "professional",
    name: "Pro Advisor",
    avatar: "💼",
    color: "bg-blue-500",
    personality: "Professional and structured"
  },
  {
    id: "casual",
    name: "Casual Buddy",
    avatar: "😎",
    color: "bg-green-500",
    personality: "Friendly and casual"
  },
  {
    id: "analytical",
    name: "Data Mind",
    avatar: "📊",
    color: "bg-orange-500",
    personality: "Analytical and data-driven"
  },
  {
    id: "minimalist",
    name: "Short & Sweet",
    avatar: "✨",
    color: "bg-pink-500",
    personality: "Minimalist and concise"
  }
];

export default function WhatsAppAIChat() {
  const { toast } = useToast();

  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "system",
      content: "Welcome! You're now chatting with 5 AI agents. Each has their own personality and will share opinions when they want to. 👋",
      timestamp: new Date(Date.now() - 60000)
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [typingAgents, setTypingAgents] = useState([]);
  const [showContentGeneration, setShowContentGeneration] = useState(false);
  const [showActiveAgents, setShowActiveAgents] = useState(true);
  const [activeAgents, setActiveAgents] = useState(ALL_AGENTS.map(agent => agent.id));
  const [showAddAgents, setShowAddAgents] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Get currently active agents
  const currentAgents = ALL_AGENTS.filter(agent => activeAgents.includes(agent.id));
  const availableAgents = ALL_AGENTS.filter(agent => !activeAgents.includes(agent.id));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingAgents]);

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

  // API mutation for agent chat
  const agentChatMutation = useMutation({
    mutationFn: async (message) => {
      const res = await apiRequest("POST", "/api/conversations", {
        message: message,
        conversationType: "agent-chat",
        activeAgents: activeAgents // Send only active agents
      });
      return res;
    },
    onSuccess: (data) => {
      if (data.agents && data.agents.length > 0) {
        // Add each agent's response as a separate message
        data.agents.forEach((agent, index) => {
          setTimeout(() => {
            const agentInfo = ALL_AGENTS.find(a => a.id === agent.agentId);
            setMessages(prev => [...prev, {
              id: Date.now() + index,
              type: "agent",
              agent: agentInfo || {
                id: agent.agentId,
                name: agent.agentName,
                avatar: agent.avatar,
                color: "bg-gray-500",
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

      setTimeout(() => setTypingAgents([]), data.agents.length * 800 + 500);
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
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Get agent opinions - only from active agents
    setTypingAgents(activeAgents);
    agentChatMutation.mutate(inputValue);

  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add agent to chat
  const addAgent = (agentId) => {
    if (!activeAgents.includes(agentId)) {
      setActiveAgents(prev => [...prev, agentId]);
      toast({
        title: "Agent added",
        description: `${ALL_AGENTS.find(a => a.id === agentId)?.name} has joined the chat`,
      });
    }
    setShowAddAgents(false);
  };

  // Remove agent from chat
  const removeAgent = (agentId) => {
    if (activeAgents.length > 1) { // Prevent removing all agents
      setActiveAgents(prev => prev.filter(id => id !== agentId));
      toast({
        title: "Agent removed",
        description: `${ALL_AGENTS.find(a => a.id === agentId)?.name} has left the chat`,
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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };


  const isLoading = agentChatMutation.isPending;

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
      {/* WhatsApp Header */}
      <div className="bg-[#1f2c33] text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex -space-x-2">
            {currentAgents.slice(0, 3).map(agent => (
              <div
                key={agent.id}
                className={`w-10 h-10 ${agent.color} rounded-full flex items-center justify-center text-lg border-2 border-[#1f2c33]`}
              >
                {agent.avatar}
              </div>
            ))}
            {currentAgents.length > 3 && (
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-sm border-2 border-[#1f2c33]">
                +{currentAgents.length - 3}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold">AI Agents Team</h2>
            <p className="text-xs text-gray-400">
              {typingAgents.length > 0
                ? `${typingAgents.length} agent${typingAgents.length > 1 ? 's' : ''} typing...`
                : `${currentAgents.length} of ${ALL_AGENTS.length} agents active`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>


      {/* Agent Preview Bar */}
      {showActiveAgents && (
        <div className="bg-[#1f2c33] px-4 py-2 border-t border-gray-700">
          <div className="flex items-center space-x-3 overflow-x-auto">
            <span className="text-xs text-gray-400 whitespace-nowrap">Active Agents:</span>
            {currentAgents.map(agent => (
              <div
                key={agent.id}
                className="flex items-center space-x-2 bg-[#0b141a] px-3 py-1.5 rounded-full whitespace-nowrap relative group"
              >
                <div className={`w-6 h-6 ${agent.color} rounded-full flex items-center justify-center text-xs`}>
                  {agent.avatar}
                </div>
                <span className="text-xs text-white">{agent.name}</span>
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>

                {/* Remove button on hover */}
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
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
          <div className="flex flex-wrap gap-2">
            {availableAgents.map(agent => (
              <Button
                key={agent.id}
                variant="outline"
                size="sm"
                onClick={() => addAgent(agent.id)}
                className="bg-[#0b141a] border-gray-600 text-white hover:bg-gray-700 text-xs h-8"
              >
                <div className={`w-4 h-4 ${agent.color} rounded-full flex items-center justify-center text-xs mr-2`}>
                  {agent.avatar}
                </div>
                {agent.name}
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
        className="flex-1 overflow-y-auto p-4 space-y-3 w-full"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#0b141a'
        }}
      >
        {messages.map((message) => (
          <div key={message.id}>
            {message.type === "system" && (
              <div className="flex justify-center my-4">
                <div className="bg-[#1f2c33] text-gray-300 text-xs px-4 py-2 rounded-lg max-w-md text-center">
                  {message.content}
                </div>
              </div>
            )}

            {message.type === "user" && (
              <div className="flex justify-end mb-2">
                <div className="max-w-[75%]">
                  <div className="bg-[#005c4b] text-white rounded-lg px-4 py-2 shadow-md">
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
                <div className="max-w-[75%] flex items-start space-x-2">
                  <div className={`w-8 h-8 ${message.agent.color} rounded-full flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <span className="text-sm">{message.agent.avatar}</span>
                  </div>
                  <div>
                    <div className="bg-[#1f2c33] text-white rounded-lg px-4 py-2 shadow-md">
                      <p className="text-xs font-semibold text-gray-400 mb-1">
                        {message.agent.name}
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
                      className={`w-6 h-6 ${agent.color} rounded-full flex items-center justify-center border-2 border-[#0b141a] shadow-md`}
                    >
                      <span className="text-xs">{agent.avatar}</span>
                    </div>
                  ) : null;
                })}
                {typingAgents.length > 3 && (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center border-2 border-[#0b141a] text-xs text-white">
                    +{typingAgents.length - 3}
                  </div>
                )}
              </div>
              <div className="bg-[#1f2c33] text-white rounded-lg px-4 py-3 shadow-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toggle buttons at the bottom only */}
      <div className="bg-[#1f2c33] border-t border-gray-700">
        <div className="flex justify-center space-x-4 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActiveAgents(!showActiveAgents)}
            className="text-gray-400 hover:text-black text-xs"
          >
            {showActiveAgents ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {showActiveAgents ? "Hide Agents" : "Show Agents"}
          </Button>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#1f2c33] px-4 py-3 border-t border-gray-700">
        <div className="flex items-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:bg-white/10 flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={showContentGeneration ? "Describe the content you want to create..." : "Ask the agents anything..."}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          {/* Add Agents Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddAgents(!showAddAgents)}
            className={`flex-shrink-0 text-gray-400 hover:bg-white/10 ${showAddAgents ? 'bg-white/20' : ''}`}
          >
            <Plus className="h-5 w-5" />
          </Button>

          {inputValue.trim() ? (
            <Button
              onClick={handleSendMessage}
              disabled={isLoading}
              size="icon"
              className="bg-[#00a884] hover:bg-[#00a884]/90 rounded-full flex-shrink-0"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={isListening ? stopListening : startListening}
              className={`flex-shrink-0 ${isListening ? 'text-red-400' : 'text-gray-400'} hover:bg-white/10`}
            >
              {isListening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          {showContentGeneration
            ? "Generate ready-to-post content for your social media"
            : `Chat with ${currentAgents.length} AI agents - they'll share their unique perspectives`
          }
        </p>
      </div>
    </div>
  );
}