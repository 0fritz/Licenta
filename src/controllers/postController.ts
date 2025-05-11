import { Request, Response } from "express";
import db from "../db";
import {Post} from "../types/postTypes";

// Create a post
export const createPost = (req: Request, res: Response): void => {
  const { content } = req.body;
  const user = (req as any).user; // Skip typing for now

  if (!content || !user?.id) {
    res.status(400).json({ error: "Missing content or user ID" });
    return;
  }

  const stmt = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
  const info = stmt.run(user.id, content);
  res.status(201).json({ id: info.lastInsertRowid, user_id: user.id, content });
};

// Get all posts
export const getPosts = (req: Request, res: Response): void => {
  const posts = db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
  res.json(posts);
};

// Update a post
export const updatePost = (req: Request, res: Response): void => {
  const postId = Number(req.params.id);
  const { content } = req.body;
  const user = (req as any).user;

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post;
  if (!post) return void res.status(404).json({ error: "Post not found" });
  if (post.user_id !== user?.id) return void res.status(403).json({ error: "Unauthorized" });

  db.prepare("UPDATE posts SET content = ? WHERE id = ?").run(content, postId);
  res.json({ message: "Post updated", postId });
};

// Delete a post
export const deletePost = (req: Request, res: Response): void => {
  const postId = Number(req.params.id);
  const user = (req as any).user;

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post;
  if (!post) return void res.status(404).json({ error: "Post not found" });
  if (post.user_id !== user?.id) return void res.status(403).json({ error: "Unauthorized" });

  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  res.json({ message: "Post deleted", postId });
};


export const uploadImg = (req: Request, res: Response): void => {
  res.status(201);
};