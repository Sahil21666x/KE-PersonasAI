// ==================== Express.js Routes (Updated for AIService) ====================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AIService = require('../services/aiService');
// Import MongoDB models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const CustomAgent = require('../models/CustomAgent');

const AI_AGENTS = [
  {
    id: "creative",
    name: "Creative Spark",
    avatar: "🎨",
    personality: "creative and innovative",
    systemPrompt: "You are a creative expert. Focus on visual storytelling, engaging narratives, and innovative ideas. Use emojis and creative formatting.",
    responseRate: 0.9
  },
  {
    id: "professional",
    name: "Pro Advisor",
    avatar: "💼",
    personality: "professional and structured",
    systemPrompt: "You are a professional advisor. Focus on value propositions, credibility, and structured content. Be formal and data-backed.",
    responseRate: 0.85
  },
  {
    id: "casual",
    name: "Casual Buddy",
    avatar: "😎",
    personality: "friendly and casual",
    systemPrompt: "You are a friendly, casual enthusiast. Keep things light, conversational, and relatable. Use casual language and humor.",
    responseRate: 0.7
  },
  {
    id: "analytical",
    name: "Data Mind",
    avatar: "📊",
    personality: "analytical and data-driven",
    systemPrompt: "You are a data-driven analyst. Focus on metrics, statistics, and performance insights. Back opinions with numbers.",
    responseRate: 0.6
  },
  {
    id: "minimalist",
    name: "Short & Sweet",
    avatar: "✨",
    personality: "minimalist and concise",
    systemPrompt: "You are a minimalist strategist. Keep responses extremely brief and impactful. Focus on clarity over elaboration.",
    responseRate: 0.5
  }
];

// ==================== GET ALL CUSTOM AGENTS ====================
router.get('/agents/custom', authenticateToken, async (req, res) => {
  try {
    const customAgents = await CustomAgent.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      agents: customAgents
    });
  } catch (error) {
    console.error('Error fetching custom agents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch custom agents' });
  }
});

// ==================== CREATE CUSTOM AGENT ====================
router.post('/agents/custom', authenticateToken, async (req, res) => {
  try {
    const { name, avatar, personality, system_prompt, response_rate } = req.body;

    if (!name || !personality) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and personality are required' 
      });
    }

    const newAgent = new CustomAgent({
      user_id: req.user.id,
      name,
      avatar: avatar || '🤖',
      personality,
      system_prompt: system_prompt || `You are ${name}. ${personality}`,
      response_rate: response_rate || 0.8
    });

    await newAgent.save();

    res.status(201).json({
      success: true,
      agent: {
        id: newAgent._id,
        name: newAgent.name,
        avatar: newAgent.avatar,
        color: 'bg-indigo-500',
        personality: newAgent.personality,
        systemPrompt: newAgent.system_prompt,
        responseRate: newAgent.response_rate,
        isCustom: true
      }
    });
  } catch (error) {
    console.error('Error creating custom agent:', error);
    res.status(500).json({ success: false, message: 'Failed to create custom agent' });
  }
});

// ==================== DELETE CUSTOM AGENT ====================
router.delete('/agents/custom/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await CustomAgent.findOneAndDelete({
      _id: agentId,
      user_id: req.user.id
    });

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Custom agent not found' 
      });
    }

    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom agent:', error);
    res.status(500).json({ success: false, message: 'Failed to delete custom agent' });
  }
});

// ==================== GET CONVERSATION HISTORY ====================
router.get('/conversations/history', authenticateToken, async (req, res) => {
  try {
    // Get all conversations for the user with preview and unread count
    const conversations = await Conversation.aggregate([
      { $match: { user_id: req.user.id } },
      {
        $lookup: {
          from: 'messages',
          let: { conversationId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$conversation_id', '$$conversationId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { content: 1 } }
          ],
          as: 'lastMessage'
        }
      },
      {
        $lookup: {
          from: 'messages',
          let: { conversationId: '$_id', lastRead: '$last_read' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversation_id', '$$conversationId'] },
                    { $eq: ['$sender_type', 'agent'] },
                    { $gt: ['$createdAt', { $ifNull: ['$$lastRead', new Date(0)] }] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'unreadMessages'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          agents: 1,
          members: 1,
          updatedAt: 1,
          preview: { $arrayElemAt: ['$lastMessage.content', 0] },
          unread: { $arrayElemAt: ['$unreadMessages.count', 0] }
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);

    const formattedConversations = conversations.map(conv => ({
      id: conv._id,
      title: conv.title,
      preview: conv.preview || 'Start a conversation...',
      timestamp: conv.updatedAt,
      unread: conv.unread || 0,
      type: conv.type,
      agents: conv.agents,
      members: conv.members
    }));

    res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

// ==================== GET CONVERSATION MESSAGES ====================
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user owns this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      user_id: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }

    // Get all messages
    const messages = await Message.find({ conversation_id: conversationId })
      .sort({ createdAt: 1 })
      .lean();

    // Get custom agents for this user
    const customAgents = await CustomAgent.find({ user_id: req.user.id }).lean();

    // Format messages with agent details
    const formattedMessages = messages.map(msg => {
      if (msg.sender_type === 'agent') {
        // Find agent in default agents or custom agents
        let agent = AI_AGENTS.find(a => a.id === msg.sender_id);
        if (!agent) {
          agent = customAgents.find(a => a._id.toString() === msg.sender_id);
        }
        
        return {
          id: msg._id,
          type: 'agent',
          agent: agent ? {
            id: agent.id || agent._id,
            name: agent.name,
            avatar: agent.avatar,
            color: agent.color || 'bg-gray-500',
            personality: agent.personality
          } : {
            id: msg.sender_id,
            name: 'Unknown Agent',
            avatar: '🤖',
            color: 'bg-gray-500',
            personality: 'Unknown'
          },
          content: msg.content,
          timestamp: msg.createdAt
        };
      } else if (msg.sender_type === 'user') {
        return {
          id: msg._id,
          type: 'user',
          content: msg.content,
          timestamp: msg.createdAt
        };
      } else {
        return {
          id: msg._id,
          type: 'system',
          content: msg.content,
          timestamp: msg.createdAt
        };
      }
    });

    res.json({
      success: true,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// ==================== SEND MESSAGE & GET AGENT RESPONSES ====================
// ==================== SEND MESSAGE & GET AGENT RESPONSES ====================
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    console.log("body :", req.body);
    
    const { message, conversationType, activeAgents, conversationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content is required' 
      });
    }

    // Get custom agents for this user
    const customAgents = await CustomAgent.find({ user_id: req.user.id }).lean();
    
    // Combine default and custom agents
    const ALL_AGENTS = [
      ...AI_AGENTS,
      ...customAgents.map(agent => ({
        id: agent._id.toString(), // Convert to string for consistency
        name: agent.name,
        avatar: agent.avatar,
        personality: agent.personality,
        systemPrompt: agent.system_prompt,
        responseRate: agent.response_rate,
        isCustom: true
      }))
    ];

    let convId = conversationId;
    let conversation;

    // Create new conversation if needed
    if (!convId) {
      // Get agent names for title - handle both default and custom agents
      const agentNames = activeAgents
        .map(id => {
          const agent = ALL_AGENTS.find(a => a.id === id);
          return agent ? agent.name : null;
        })
        .filter(Boolean);

      const title = conversationType === 'group' 
        ? `Group Chat (${activeAgents.length})`
        : agentNames[0] || 'AI Chat';

      conversation = new Conversation({
        user_id: req.user.id,
        title,
        type: conversationType || 'single',
        agents: activeAgents,
        members: activeAgents.length
      });

      await conversation.save();
      convId = conversation._id;
    } else {
      // Verify existing conversation belongs to user
      conversation = await Conversation.findOne({
        _id: convId,
        user_id: req.user.id
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Update conversation agents if they changed
      if (activeAgents && JSON.stringify(conversation.agents) !== JSON.stringify(activeAgents)) {
        conversation.agents = activeAgents;
        conversation.members = activeAgents.length;
        await conversation.save();
      }
    }

    // Save user message
    const userMessage = new Message({
      conversation_id: convId,
      sender_type: 'user',
      sender_id: req.user.id,
      content: message
    });

    await userMessage.save();

    // Update conversation timestamp
    await Conversation.findByIdAndUpdate(convId, { updatedAt: new Date() });

    try {
      // Generate AI responses using AIService - pass ALL_AGENTS including custom ones
      const aiResponse = await AIService.generateMultiAgentResponses(
        message, 
        activeAgents, 
        ALL_AGENTS // Pass the combined agents list
      );
      
      const agentResponses = [];

      // Save each agent response
      for (const agentResponse of aiResponse.agents) {
        const agentMessage = new Message({
          conversation_id: convId,
          sender_type: 'agent',
          sender_id: agentResponse.agentId,
          content: agentResponse.response
        });

        await agentMessage.save();

        agentResponses.push({
          agentId: agentResponse.agentId,
          agentName: agentResponse.agentName,
          avatar: agentResponse.avatar,
          personality: agentResponse.personality,
          response: agentResponse.response,
          timestamp: agentResponse.timestamp
        });
      }

      res.json({
        success: true,
        conversationId: convId,
        agents: agentResponses,
        totalAgents: aiResponse.totalAgents,
        respondingAgents: aiResponse.respondingAgents
      });

    } catch (aiError) {
      console.error('AI Service error:', aiError);
      
      // If AI service fails, still return success but with empty responses
      res.json({
        success: true,
        conversationId: convId,
        agents: [],
        totalAgents: activeAgents.length,
        respondingAgents: 0,
        aiError: aiError.message
      });
    }

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ success: false, message: 'Failed to process message' });
  }
});

// ==================== DELETE CONVERSATION ====================
router.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await Conversation.findOneAndDelete({
      _id: conversationId,
      user_id: req.user.id
    });

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found' 
      });
    }

    // Also delete all messages in this conversation
    await Message.deleteMany({ conversation_id: conversationId });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ success: false, message: 'Failed to delete conversation' });
  }
});

// ==================== MARK CONVERSATION AS READ ====================
router.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Conversation.findOneAndUpdate(
      { _id: conversationId, user_id: req.user.id },
      { last_read: new Date() }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// ==================== UPDATE CONVERSATION TITLE ====================
router.patch('/conversations/:conversationId/title', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, user_id: req.user.id },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation: {
        id: conversation._id,
        title: conversation.title
      }
    });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ success: false, message: 'Failed to update title' });
  }
});

// ==================== GET AGENT CONFIGURATION ====================
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    // Get custom agents for this user
    const customAgents = await CustomAgent.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Combine default agents with custom agents
    const allAgents = [
      ...AI_AGENTS.map(agent => ({
        ...agent,
        isCustom: false
      })),
      ...customAgents.map(agent => ({
        id: agent._id,
        name: agent.name,
        avatar: agent.avatar,
        color: agent.color || 'bg-indigo-500',
        personality: agent.personality,
        systemPrompt: agent.system_prompt,
        responseRate: agent.response_rate,
        isCustom: true
      }))
    ];

    res.json({
      success: true,
      agents: allAgents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
});

module.exports = router;