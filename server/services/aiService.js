const { GoogleGenerativeAI } = require('@google/generative-ai');

// Define AI Agents with their personalities
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

class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Generate multi-agent responses for a user message
   */
  async generateMultiAgentResponses(userMessage) {
    if (!this.genAI) {
      throw new Error('AI service not configured - GEMINI_API_KEY missing');
    }

    try {
      // Determine which agents will respond based on their response rate
      const respondingAgents = AI_AGENTS.filter(agent => 
        Math.random() < agent.responseRate
      );

      // If no agents respond, ensure at least one does
      if (respondingAgents.length === 0) {
        respondingAgents.push(AI_AGENTS[0]);
      }

      // Generate responses from each agent in parallel
      const agentPromises = respondingAgents.map(agent => 
        this.generateAgentResponse(agent, userMessage)
      );

      const agentResponses = await Promise.all(agentPromises);

      return {
        agents: agentResponses.filter(response => response !== null),
        totalAgents: AI_AGENTS.length,
        respondingAgents: respondingAgents.length
      };

    } catch (error) {
      console.error('Multi-agent generation error:', error);
      throw new Error(`Multi-agent generation failed: ${error.message}`);
    }
  }

  /**
   * Generate response from a single agent
   */
  async generateAgentResponse(agent, userMessage) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      // Build agent-specific prompt
      const systemContext = agent.systemPrompt;
      
      const prompt = `${systemContext}

User Message: "${userMessage}"

Task: Provide your unique perspective on this request. Focus on your expertise (${agent.personality}).

Response format:
1. Share your opinion/advice about the user's request (2-3 sentences)
2. You can optionally suggest specific ideas

Keep your response authentic to your personality and expertise. Be helpful but stay true to your character.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        agentId: agent.id,
        agentName: agent.name,
        avatar: agent.avatar,
        personality: agent.personality,
        response: text.trim(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error generating response for agent ${agent.id}:`, error);
      return null;
    }
  }

}
  

module.exports = new AIService();