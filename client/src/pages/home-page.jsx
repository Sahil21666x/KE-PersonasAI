import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import AiChat from "@/components/ai-chat";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function HomePage() {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [activeAgents, setActiveAgents] = useState([]);
  const [conversationType, setConversationType] = useState("single");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch conversation history to get the first conversation
  const { data: conversationsData = {}, isLoading } = useQuery({
    queryKey: ['api/conversations/history'],
  });

  const conversations = conversationsData.conversations || [];

  // Set the first conversation as active on initial load - ONLY ONCE
  useEffect(() => {
    if (!hasInitialized && !isLoading && conversations.length > 0) {
      const firstConversation = conversations[0];
      setCurrentConversationId(firstConversation.id);
      setActiveAgents(firstConversation.agents || []);
      setConversationType(firstConversation.type || "single");
      setHasInitialized(true);
    } else if (!hasInitialized && !isLoading && conversations.length === 0) {
      // If no conversations exist, start with a default agent
      setActiveAgents(["creative"]);
      setHasInitialized(true);
    }
  }, [conversations, hasInitialized, isLoading]);

  // Handle conversation selection from sidebar
  const handleConversationSelect = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setActiveAgents(conversation.agents || []);
      setConversationType(conversation.type || "single");
    }
    // Close sidebar on mobile after selection
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Handle new conversation from sidebar - FIXED: Clear current conversation ID
  const handleNewConversation = (agentIds, type = "single") => {
    setCurrentConversationId(null); // This is important for new conversations
    setActiveAgents(agentIds);
    setConversationType(type);
    // Close sidebar on mobile after creating new conversation
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="flex h-screen bg-background relative">
      {/* Mobile Header with Hamburger */}
      {isMobile && (
        <div className="md:hidden absolute top-0 left-0 right-0 z-40 bg-[#1f2c33] p-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <span className="text-white font-semibold text-sm">Personas AI</span>
          </div>
          <div className="w-9"></div> {/* Spacer for balance */}
        </div>
      )}

      {/* Sidebar with responsive behavior */}
      <div className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative z-30 w-80 md:w-80 flex-shrink-0 h-full
      `}>
        <Sidebar
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          showSidebar={showSidebar}
          onCloseSidebar={() => setShowSidebar(false)}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {showSidebar && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content Area - Full width AI Chat */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Content - AI Chat taking full available space */}
        <main className="flex-1 w-full overflow-hidden pt-0 md:pt-0">
          <AiChat 
            currentConversationId={currentConversationId}
            activeAgents={activeAgents}
            conversationType={conversationType}
            onNewConversation={handleNewConversation}
            key={currentConversationId || "new"} // Add key to force re-render
            onToggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
        </main>
      </div>
    </div>
  );
}