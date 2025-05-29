import express from "express";
import { sendMessage, startChat, getMessages, getChats } from "../controllers/chatController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

// All routes below require authentication
router.use(authenticate);

// Start a new chat or return existing one
router.post("/chats/start", startChat);

// Send a message in a chat
router.post("/chats/messages", sendMessage);

// Get messages in a chat
router.get("/chats/:chatId/messages", getMessages);

// Get all chats for the current user
router.get("/chats", getChats);

export default router;