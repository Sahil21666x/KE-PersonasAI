// models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  user_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['single', 'group'],
    default: 'single'
  },
  agents: [{
    type: String,
    required: true
  }],
  members: {
    type: Number,
    default: 1
  },
  last_read: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ user_id: 1, updatedAt: -1 });
conversationSchema.index({ _id: 1, user_id: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);