const aiService = require('../services/aiService');

/**
 * Handle conversation with multi-agent AI system
 * POST /api/conversations
 */
async function createConversation(req, res) {
  try {
    const { 
      message, 
      conversationType = 'agent-chat' // 'agent-chat' or 'content-generation'
    } = req.body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Determine the type of response based on conversationType
    let result;

    if (conversationType === 'content-generation') {
      // Since generateSocialContent is removed, use multi-agent for content generation too
      // or you can create a separate content generation method
      result = await aiService.generateMultiAgentResponses(message);

      return res.status(200).json({
        success: true,
        type: 'content',
        agents: result.agents,
        totalAgents: result.totalAgents,
        respondingAgents: result.respondingAgents,
        message: 'Content suggestions generated successfully'
      });

    } else {
      // Multi-agent chat mode (default)
      result = await aiService.generateMultiAgentResponses(message);

      return res.status(200).json({
        success: true,
        type: 'agent-responses',
        agents: result.agents,
        totalAgents: result.totalAgents,
        respondingAgents: result.respondingAgents,
        message: 'Agent responses generated successfully'
      });
    }

  } catch (error) {
    console.error('Conversation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process conversation',
      message: error.message
    });
  }
}

module.exports = {
  createConversation
};