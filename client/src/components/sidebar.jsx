import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Users, Search, MoreVertical, Trash2, X, Check, Sparkles, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";

// Default agents configuration
const DEFAULT_AGENTS = [
  {
    id: "creative",
    name: "Creative Spark",
    avatar: "🎨",
    color: "bg-purple-500",
    personality: "Creative and innovative",
    systemPrompt: "You are a creative content creator. Focus on engaging, imaginative ideas.",
    responseRate: 0.9
  },
  {
    id: "professional",
    name: "Pro Advisor",
    avatar: "💼",
    color: "bg-blue-500",
    personality: "Professional and structured",
    systemPrompt: "You are a professional advisor. Focus on value propositions, credibility, and structured content.",
    responseRate: 0.85
  },
  {
    id: "casual",
    name: "Casual Buddy",
    avatar: "😎",
    color: "bg-green-500",
    personality: "Friendly and casual",
    systemPrompt: "You are a friendly companion. Be warm, relatable, and conversational.",
    responseRate: 0.8
  },
  {
    id: "analytical",
    name: "Data Mind",
    avatar: "📊",
    color: "bg-orange-500",
    personality: "Analytical and data-driven",
    systemPrompt: "You are a data analyst. Focus on metrics, insights, and evidence-based reasoning.",
    responseRate: 0.75
  },
  {
    id: "minimalist",
    name: "Short & Sweet",
    avatar: "✨",
    color: "bg-pink-500",
    personality: "Minimalist and concise",
    systemPrompt: "You are concise and to-the-point. Provide brief, impactful responses.",
    responseRate: 0.7
  }
];

export default function ChatSidebar({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  showSidebar = true,
  onCloseSidebar
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(null);
  const [currentView, setCurrentView] = useState("chats"); // chats, newChat, newGroup, createAgent
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    avatar: "🤖",
    personality: "",
    systemPrompt: "",
    responseRate: 0.8
  });

  // Close sidebar when view changes on mobile
  useEffect(() => {
    const handleViewChange = () => {
      if (window.innerWidth < 768 && currentView === "chats") {
        // Don't close when going back to chats view
        return;
      }
    };
    handleViewChange();
  }, [currentView]);

  // Fetch conversation history from backend
  const { data: conversationsData = {}, isLoading: conversationsLoading } = useQuery({
    queryKey: ['api/conversations/history'],
    enabled: !!user && showSidebar,
  });

  const conversations = conversationsData.conversations || [];

  // Fetch custom agents from backend
  const { data: customAgentsData = {}, isLoading: agentsLoading } = useQuery({
    queryKey: ['api/agents/custom'],
    enabled: !!user && showSidebar,
  });

  const customAgents = customAgentsData.agents || [];
  const allAgents = [...DEFAULT_AGENTS, ...customAgents];

  // Mutation for creating custom agent
  const createAgentMutation = useMutation({
    mutationFn: async (agentData) => {
      const res = await apiRequest("POST", "/api/agents/custom", agentData);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/agents/custom']);
      toast({
        title: "Success",
        description: "Custom agent created successfully"
      });
      setCurrentView("newChat");
      setNewAgentForm({
        name: "",
        avatar: "🤖",
        personality: "",
        systemPrompt: "",
        responseRate: 0.8
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create custom agent",
        variant: "destructive"
      });
    }
  });

  // Mutation for deleting conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/conversations/history']);
      toast({
        title: "Success",
        description: "Conversation deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete conversation",
        variant: "destructive"
      });
    }
  });

  // Handle selecting agent for new chat
  const handleSelectAgent = (agentId) => {
    // Create a new conversation with the selected agent
    onNewConversation([agentId]);
    setCurrentView("chats");
    if (onCloseSidebar && window.innerWidth < 768) {
      onCloseSidebar();
    }
  };

  // Handle toggling agent selection for group
  const toggleAgentSelection = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Create group with selected agents
  const handleCreateGroup = () => {
    if (selectedAgents.length === 0) return;

    // Create a new group conversation with selected agents
    onNewConversation(selectedAgents, "group");
    setSelectedAgents([]);
    setCurrentView("chats");
    if (onCloseSidebar && window.innerWidth < 768) {
      onCloseSidebar();
    }
  };

  // Create custom agent
  const handleCreateAgent = () => {
    if (!newAgentForm.name || !newAgentForm.personality) {
      toast({
        title: "Error",
        description: "Name and personality are required",
        variant: "destructive"
      });
      return;
    }

    createAgentMutation.mutate({
      name: newAgentForm.name,
      avatar: newAgentForm.avatar,
      personality: newAgentForm.personality,
      systemPrompt: newAgentForm.systemPrompt,
      responseRate: newAgentForm.responseRate
    });
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    deleteConversationMutation.mutate(conversationId);
    setShowOptions(null);
  };

  // Load existing conversation
  const handleLoadConversation = (conversation) => {
    onConversationSelect(conversation.id);
    if (onCloseSidebar && window.innerWidth < 768) {
      onCloseSidebar();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const emojiOptions = ["🤖", "🎯", "🚀", "💡", "🎪", "🎭", "🎬", "🎮", "🎲", "🧠", "⚡", "🔥", "💎", "🌟", "🦾"];

  if (!showSidebar) return null;

  return (
    <div className="w-80 bg-[#111b21] border-r border-[#2a3942] flex flex-col h-screen">
      {/* Header with Logo */}
      <div className="bg-[#202c33] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {currentView !== "chats" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentView("chats")}
                className="text-gray-400 hover:bg-[#2a3942]"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-robot text-white text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {currentView === "chats" && "Personas AI"}
                {currentView === "newChat" && "New Chat"}
                {currentView === "newGroup" && "New Group"}
                {currentView === "createAgent" && "Create Agent"}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {currentView === "chats" && "Multi-Agent Chat"}
                {currentView === "newChat" && "Select an agent"}
                {currentView === "newGroup" && `${selectedAgents.length} selected`}
                {currentView === "createAgent" && "Custom AI Agent"}
              </p>
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:bg-[#2a3942]"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar - only in chats view */}
        {currentView === "chats" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2a3942] text-white text-sm rounded-lg pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-[#00a884] placeholder-gray-500"
            />
          </div>
        )}
      </div>

      {/* Action Buttons - only in chats view */}
      {currentView === "chats" && (
        <div className="bg-[#202c33] px-4 pb-3 border-b border-[#2a3942]">
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentView("newChat")}
              className="flex-1 bg-[#00a884] hover:bg-[#00a884]/90 text-white text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button
              onClick={() => {
                setSelectedAgents([]);
                setCurrentView("newGroup");
              }}
              variant="outline"
              className="flex-1 border-[#2a3942] text-black "
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Chats List View */}
        {currentView === "chats" && (
          <>
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 text-[#00a884] animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-16 h-16 bg-[#2a3942] rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-gray-400 text-sm mb-2">No conversations yet</p>
                <p className="text-gray-600 text-xs">
                  Start a new chat to begin talking with AI agents
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#2a3942]">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleLoadConversation(conversation)}
                    className={`flex items-center p-4 cursor-pointer transition-colors relative group ${currentConversationId === conversation.id
                        ? "bg-[#2a3942]"
                        : "hover:bg-[#202c33]"
                      }`}
                  >
                    {/* Avatar */}
                    <div className="relative mr-3 flex-shrink-0">
                      {conversation.type === "group" ? (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-purple-500 to-pink-600">
                          {(() => {
                            const agentId = conversation.agents?.[0];
                            const agent = allAgents.find(a => a.id === agentId);
                            return agent?.avatar || "🤖";
                          })()}
                        </div>
                      )}
                      {conversation.unread > 0 && (
                        <div className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unread}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white font-medium text-sm truncate">
                          {conversation.title}
                        </h3>
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(conversation.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-400 text-xs truncate">
                          {conversation.preview}
                        </p>
                        {conversation.type === "group" && (
                          <span className="text-xs text-gray-500 ml-2 flex items-center flex-shrink-0">
                            <Users className="h-3 w-3 mr-1" />
                            {conversation.members}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* New Chat View - Select Agent */}
        {currentView === "newChat" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Select an Agent</h3>
              <Button
                onClick={() => setCurrentView("createAgent")}
                size="sm"
                className="bg-[#00a884] hover:bg-[#00a884]/90 text-white text-xs h-8"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Create Agent
              </Button>
            </div>

            {agentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 text-[#00a884] animate-spin" />
              </div>
            ) : (
              allAgents.map((agent) => (
                <div
                  key={agent.id || agent._id}
                  onClick={() => handleSelectAgent(agent.id || agent._id)}
                  className="flex items-center p-3 bg-[#202c33] hover:bg-[#2a3942] rounded-lg cursor-pointer transition-colors"
                >
                  <div className={`w-12 h-12 ${agent.color} rounded-full flex items-center justify-center text-xl mr-3 flex-shrink-0`}>
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">{agent.name}</h4>
                    <p className="text-gray-400 text-xs truncate">{agent.personality}</p>
                    {agent.isCustom && (
                      <span className="text-[#00a884] text-xs">Custom Agent</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* New Group View - Select Multiple Agents */}
        {currentView === "newGroup" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allAgents.map((agent) => (
                <div
                  key={agent.id || agent._id}
                  onClick={() => toggleAgentSelection(agent.id || agent._id)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedAgents.includes(agent.id)
                      ? "bg-[#2a3942]"
                      : "bg-[#202c33] hover:bg-[#2a3942]"
                    }`}
                >
                  <div className={`w-12 h-12 ${agent.color} rounded-full flex items-center justify-center text-xl mr-3 flex-shrink-0`}>
                    {agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">{agent.name}</h4>
                    <p className="text-gray-400 text-xs truncate">{agent.personality}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedAgents.includes(agent.id)
                      ? "bg-[#00a884] border-[#00a884]"
                      : "border-gray-500"
                    }`}>
                    {selectedAgents.includes(agent.id) && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#202c33] border-t border-[#2a3942]">
              <Button
                onClick={handleCreateGroup}
                disabled={selectedAgents.length === 0}
                className="w-full bg-[#00a884] hover:bg-[#00a884]/90 text-white disabled:opacity-50 text-sm"
              >
                Create Group with {selectedAgents.length} Agent{selectedAgents.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Create Agent View */}
        {currentView === "createAgent" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Agent Name *</label>
                <input
                  type="text"
                  value={newAgentForm.name}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Marketing Expert"
                  className="w-full bg-[#2a3942] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884]"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewAgentForm(prev => ({ ...prev, avatar: emoji }))}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xl transition-colors ${newAgentForm.avatar === emoji
                          ? "bg-[#00a884]"
                          : "bg-[#2a3942] hover:bg-[#374047]"
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">Personality *</label>
                <input
                  type="text"
                  value={newAgentForm.personality}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, personality: e.target.value }))}
                  placeholder="e.g., Enthusiastic and persuasive"
                  className="w-full bg-[#2a3942] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884]"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">System Prompt (Optional)</label>
                <textarea
                  value={newAgentForm.systemPrompt}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder="Define how this agent should behave..."
                  rows={3}
                  className="w-full bg-[#2a3942] text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884] resize-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">
                  Response Rate: {(newAgentForm.responseRate * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={newAgentForm.responseRate}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, responseRate: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-gray-500 text-xs mt-1">
                  How often this agent responds to messages
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreateAgent}
              disabled={!newAgentForm.name || !newAgentForm.personality || createAgentMutation.isPending}
              className="w-full bg-[#00a884] hover:bg-[#00a884]/90 text-white disabled:opacity-50 text-sm"
            >
              {createAgentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="bg-[#202c33] p-4 border-t border-[#2a3942]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {getInitials(user?.firstName, user?.lastName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.username || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/auth';
            }}
            className="text-gray-400 hover:text-white hover:bg-red-500/10 ml-2 flex-shrink-0"
            title="Logout"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}