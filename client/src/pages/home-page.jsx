import { useState } from "react";
import Sidebar from "@/components/sidebar";
import AiChat from "@/components/ai-chat";

export default function HomePage() {
  const [currentView, setCurrentView] = useState("ai-chat");
  const [isPostEditorOpen, setIsPostEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const onSchedulePost = (content) => {
    console.log("Scheduling post:", content);

    // Create a proper post object from the AI-generated content
    const postData = {
      content: content.content,
      platforms: [content.platform],
      scheduledAt: content.scheduledAt || new Date().toISOString(),
      postType: 'static',
      status: "draft",
      hashtags: content.hashtags || [],
      mentions: content.mentions || [],
      aiGenerated: true,
    };

    setEditingPost(postData);
    setIsPostEditorOpen(true);
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar on the left */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onCreatePost={() => setIsPostEditorOpen(true)}
      />

      {/* Main Content Area - Full width AI Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content - AI Chat taking full available space */}
        <main className="flex-1 w-full overflow-hidden">
          <AiChat onSchedulePost={onSchedulePost} />
        </main>
      </div>

      {/* Post Editor Modal */}
      {isPostEditorOpen && (
        <PostEditor
          post={editingPost}
          onSave={() => {
            setIsPostEditorOpen(false);
            setEditingPost(null);
          }}
          onCancel={() => {
            setIsPostEditorOpen(false);
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}