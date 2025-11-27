// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  conversation_id: {
    type: String,
    required: true,
    ref: 'Conversation'
  },
  sender_type: {
    type: String,
    enum: ['user', 'agent', 'system'],
    required: true
  },
  sender_id: {
    type: String
  },
  content: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ conversation_id: 1, createdAt: 1 });
messageSchema.index({ conversation_id: 1, sender_type: 1 });

module.exports = mongoose.model('Message', messageSchema);