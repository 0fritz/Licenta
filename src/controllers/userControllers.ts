import {Request, Response} from "express";
import db from "../db";
import { User, UserImage } from "../types/userTypes";
import path from "path";
import fs from "fs";


interface AuthRequest extends Request {
  user?: { id: number };
}

export const getUserProfile = (req: Request, res: Response): void => {
  const id = parseInt(req.params.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tags = db.prepare("SELECT tag FROM user_tags WHERE user_id = ?").all(id) as { tag: string }[];

  user.tags = tags.map((row: { tag: string }) => row.tag);

  res.json(user);
};

export const updateUserProfile = (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id);

  if (req.user?.id !== id) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User;
  if (!currentUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updated = {
    name: req.body.name ?? currentUser.name,
    profile_picture: req.body.profile_picture ?? currentUser.profile_picture,
    cover_image: req.body.cover_image ?? currentUser.cover_image,
    location: req.body.location ?? currentUser.location,
    website: req.body.website ?? currentUser.website,
    bio: req.body.bio ?? currentUser.bio,
  };

  db.prepare(`
    UPDATE users
    SET name = ?, profile_picture = ?, cover_image = ?, location = ?, website = ?, bio = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.profile_picture,
    updated.cover_image,
    updated.location,
    updated.website,
    updated.bio,
    id
  );

  res.json({ message: "Profile updated" });
};


export const addUserTag = (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id);
  if (req.user?.id !== id) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const { tag } = req.body;
  if (!tag || typeof tag !== "string") {
    res.status(400).json({ error: "Valid tag is required" });
    return;
  }

  db.prepare("INSERT OR IGNORE INTO user_tags (user_id, tag) VALUES (?, ?)").run(id, tag);
  res.json({ message: "Tag added" });
};


export const removeUserTag = (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id);
  if (req.user?.id !== id) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const tag = req.params.tag;
  db.prepare("DELETE FROM user_tags WHERE user_id = ? AND tag = ?").run(id, tag);
  res.json({ message: "Tag removed" });
};


export const uploadProfilePicture = (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id);
  const filename = req.file?.filename;

  if (!filename) {
    res.status(400).json({ error: "No image uploaded" });
    return;
  }

  if (req.user?.id !== id) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const fileUrl = `/uploads/${filename}`;
  db.prepare("UPDATE users SET profile_picture = ? WHERE id = ?").run(fileUrl, id);
  res.json({ message: "Profile picture updated", url: fileUrl });
};


export const uploadCoverImage = (req: AuthRequest, res: Response): void => {
  const id = parseInt(req.params.id);
  const filename = req.file?.filename;

  if (!filename) {
    res.status(400).json({ error: "No image uploaded" });
    return;
  }

  if (req.user?.id !== id) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const fileUrl = `/uploads/${filename}`;
  db.prepare("UPDATE users SET cover_image = ? WHERE id = ?").run(fileUrl, id);
  res.json({ message: "Cover image updated", url: fileUrl });
};

export const downloadImage = (req: Request, res: Response): void => {
  const filename = req.params.filename;

  if (!filename) {
    res.status(400).json({ error: "No filename provided" });
    return;
  }

  const filePath = path.join(__dirname, "..", "uploads", filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error("Download error:", err.message);
      res.status(404).json({ error: "File not found" });
    }
  });
};

export const uploadPicture = (req: Request, res: Response): void => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  // Full path where the file is saved
  const filePath = file.path;

  console.log("Uploaded file:", file.filename);

  res.json({
    message: "File uploaded successfully",
    filename: file.filename,
    url: `/uploads/${file.filename}`,
  });
};


//GALLERY FUNCTIONS

export const uploadGalleryImage = (req: Request, res: Response):void => {
  const userId = Number(req.params.id);
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No image uploaded" });
    return;
  }

  const imageUrl = `/uploads/${file.filename}`;
  db.prepare(`INSERT INTO user_images (user_id, image_url) VALUES (?, ?)`).run(userId, imageUrl);

  res.status(201).json({ message: "Image uploaded", imageUrl });
};


export const getUserImages = (req: Request, res: Response) => {
  const userId = Number(req.params.id);

  const images = db.prepare(`SELECT id, image_url, uploaded_at FROM user_images WHERE user_id = ? ORDER BY uploaded_at DESC`).all(userId);
  res.json(images);
};


export const deleteUserImage = (req: Request, res: Response):void => {
  const imageId = Number(req.params.imageId);

  const image = db
    .prepare(`SELECT * FROM user_images WHERE id = ?`)
    .get(imageId) as UserImage | undefined;

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  // Delete file from disk
  const imagePath = path.join(__dirname, "..", "uploads", path.basename(image.image_url));

  fs.unlink(imagePath, (err) => {
    if (err) {
      console.warn("Failed to delete image file:", err);
      // Optionally still delete the DB record even if file not found
    }
  });

  // Delete from DB
  db.prepare(`DELETE FROM user_images WHERE id = ?`).run(imageId);

  res.json({ message: "Image deleted" });
};

export const respondToFriendRequest = (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  const { fromUserId, decision } = req.body;

  if (!userId || typeof fromUserId !== "number" || !["accepted", "rejected"].includes(decision)) {
    res.status(400).json({ error: "Valid fromUserId and decision ('accepted' or 'rejected') are required" });
    return;
  }

  const result = db.prepare(`
    UPDATE friendships
    SET status = ?
    WHERE user_id1 = ? AND user_id2 = ? AND status = 'pending'
  `).run(decision, fromUserId, userId);

  if (result.changes === 0) {
    res.status(404).json({ error: "Friend request not found or already handled" });
    return;
  }

  res.json({ message: `Friend request ${decision}` });
};


export const sendFriendRequest = (req: AuthRequest, res: Response): void => {
  const userId1 = req.user?.id;
  const { user_id2 } = req.body;

  if (!userId1 || typeof user_id2 !== "number") {
    res.status(400).json({ error: "Valid user_id2 is required" });
    return;
  }

  if (userId1 === user_id2) {
    res.status(400).json({ error: "Cannot send friend request to yourself" });
    return;
  }

  db.prepare(`
    INSERT OR IGNORE INTO friendships (user_id1, user_id2, status)
    VALUES (?, ?, 'pending')
  `).run(userId1, user_id2);

  res.json({ message: "Friend request sent" });
};

export const getPendingFriendRequests = (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const requests = db.prepare(`
    SELECT user_id1 AS fromUserId
    FROM friendships
    WHERE user_id2 = ? AND status = 'pending'
  `).all(userId);

  res.json({ requests });
};

export const getUserProfiles = (req: Request, res: Response): void => {
  const users = db.prepare("SELECT * FROM users").all() as User[];
  res.json(users);
};



