const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth'); // Your auth middleware

/**
 * POST /api/conversations
 * Main endpoint for multi-agent chat
 * Body: { message, platforms?, conversationType?, businessContext? }
 */
router.post(
  '/', // Optional: remove if you want to allow unauthenticated access
  conversationController.createConversation
);



module.exports = router;