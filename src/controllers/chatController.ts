import { Response, Request } from "express";
import { AuthenticatedRequest } from "../types/requestTypes";
import { Chat } from "../types/chatTypes";
import db from "../db";

export const startChat = (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { userId } = req.body;

    if (!userId || userId === user.id) {
      res.status(400).json({ error: "Invalid target user ID" });
      return;
    }

    // Check if target user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    // Store user1/user2 in consistent order
    const [user1_id, user2_id] = user.id < userId
      ? [user.id, userId]
      : [userId, user.id];

    const existingChat = db.prepare(`
      SELECT * FROM chats
      WHERE user1_id = ? AND user2_id = ?
    `).get(user1_id, user2_id) as Chat | undefined;

    if (existingChat) {
      res.json({ chatId: existingChat.id, existing: true });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO chats (user1_id, user2_id)
      VALUES (?, ?)
    `);
    const info = stmt.run(user1_id, user2_id);

    res.status(201).json({ chatId: info.lastInsertRowid, existing: false });
    return;
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};


export const sendMessage = (req: Request, res: Response) => {
  const user = (req as any).user;
  const { chat_id, content } = req.body as {
    chat_id: number;
    content: string;
  };

  if (!chat_id || !content) {
    res.status(400).json({ error: "chat_id and content are required." });
    return;
  }

  try {
    const chat = db.prepare("SELECT * FROM chats WHERE id = ?").get(chat_id) as {
      id: number;
      user1_id: number;
      user2_id: number;
      created_at: string;
    } | undefined;

    if (!chat) {
      res.status(404).json({ error: "Chat not found." });
      return;
    }

    if (chat.user1_id !== user.id && chat.user2_id !== user.id) {
      res.status(403).json({ error: "Unauthorized: not a participant in this chat." });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(chat_id, user.id, content.trim());

    const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ message });
    return;
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error." });
    return;
  }
};


export const getMessages = (req: Request, res: Response) => {
  const user = (req as any).user;
  const chatId = Number(req.params.chatId);

  if (!chatId) {
    res.status(400).json({ error: "Chat ID is required." });
    return;
  }

  const chat = db.prepare("SELECT * FROM chats WHERE id = ?").get(chatId) as {
    id: number;
    user1_id: number;
    user2_id: number;
    created_at: string;
  } | undefined;

  if (!chat) {
    res.status(404).json({ error: "Chat not found." });
    return;
  }

  if (chat.user1_id !== user.id && chat.user2_id !== user.id) {
    res.status(403).json({ error: "Unauthorized: not a participant in this chat." });
    return;
  }

  const messages = db.prepare(`
    SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(chatId);

  res.json({ chatId, messages });
  return;
};

export const getChats = (req: Request, res: Response) => {
  const user = (req as any).user;

  const chats = db.prepare(`
    SELECT 
      c.id as chat_id,
      u.id as partner_id,
      u.name,
      u.profile_picture,
      c.created_at
    FROM chats c
    JOIN users u ON 
      (u.id = c.user1_id AND c.user2_id = ?) OR 
      (u.id = c.user2_id AND c.user1_id = ?)
    ORDER BY c.created_at DESC
  `).all(user.id, user.id);

  res.json({ chats });
};





