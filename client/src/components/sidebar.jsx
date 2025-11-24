import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Plus, MessageSquare, Users, Search, MoreVertical, Trash2 } from "lucide-react";

export default function ChatSidebar({ onConversationSelect, currentConversationId }) {
  const { user, logoutMutation } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(null);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Fetch conversation history
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/conversations/history`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      }
    };
    fetchConversations();
  }, []);

  // Create new conversation
  const handleNewChat = () => {
    const newConversation = {
      id: `new-${Date.now()}`,
      title: "New Chat",
      preview: "Start a conversation with AI agents...",
      timestamp: new Date().toISOString(),
      unread: 0,
      type: "chat"
    };
    setConversations(prev => [newConversation, ...prev]);
    onConversationSelect(newConversation);
  };

  // Create new group
  const handleNewGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      title: "New Group",
      preview: "Create a group conversation...",
      timestamp: new Date().toISOString(),
      unread: 0,
      type: "group",
      members: 5
    };
    setConversations(prev => [newGroup, ...prev]);
    onConversationSelect(newGroup);
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/conversations/${conversationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );

      if (res.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        setShowOptions(null);
      }
    } catch (error) {
      console.error("Failed to delete conversation", error);
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

  return (
    <div className="w-80 bg-[#111b21] border-r border-[#2a3942] flex flex-col h-screen">
      {/* Header with Logo */}
      <div className="bg-[#202c33] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-robot text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Personas AI</h1>
              <p className="text-xs text-gray-400">Multi-Agent Chat</p>
            </div>
          </div>
          
          {/* User Menu */}
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

        {/* Search Bar */}
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
      </div>

      {/* Action Buttons */}
      <div className="bg-[#202c33] px-4 pb-3 border-b border-[#2a3942]">
        <div className="flex gap-2">
          <Button
            onClick={handleNewChat}
            className="flex-1 bg-[#00a884] hover:bg-[#00a884]/90 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Button
            onClick={handleNewGroup}
            variant="outline"
            className="flex-1 border-[#2a3942] text-black"
            size="sm"
          >
            <Users className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
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
                onClick={() => onConversationSelect(conversation)}
                className={`flex items-center p-4 cursor-pointer transition-colors relative group ${
                  currentConversationId === conversation.id
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-robot text-white text-lg"></i>
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
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTime(conversation.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs truncate">
                      {conversation.preview}
                    </p>
                    {conversation.type === "group" && (
                      <span className="text-xs text-gray-500 ml-2 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {conversation.members}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button (shown on hover) */}
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
      </div>

      {/* User Profile Section */}
      <div className="bg-[#202c33] p-4 border-t border-[#2a3942]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-400 hover:text-white hover:bg-[#2a3942]"
            title="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}