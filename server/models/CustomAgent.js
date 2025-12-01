// models/CustomAgent.js
const mongoose = require('mongoose');

const customAgentSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: '🤖'
  },
  color: {
    type: String,
    default: 'bg-indigo-500'
  },
  personality: {
    type: String,
    required: true
  },
  system_prompt: {
    type: String
  },
  response_rate: {
    type: Number,
    default: 0.80,
    min: 0,
    max: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
customAgentSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('CustomAgent', customAgentSchema);