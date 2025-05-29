import { Request, Response } from "express";
import db from "../db";

export const createEvent = (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, description, location, date, time, maxAttendees } = req.body;
  const file = req.file;

  if (!title || !date || !time || !maxAttendees) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const imagePath = file ? file.path : null;

  const stmt = db.prepare(`
    INSERT INTO events (user_id, title, description, location, date, time, max_attendees, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    user.id,
    title,
    description,
    location,
    date,
    time,
    Number(maxAttendees),
    imagePath
  );

  res.status(201).json({ message: "Event created", eventId: result.lastInsertRowid });
  return;
};

export const deleteEvent = (req: Request, res: Response) => {
    const user = (req as any).user;
    const eventId = Number(req.params.id);
  
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as {
      id: number;
      user_id: number;
    } | undefined;
  
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
  
    if (event.user_id !== user.id) {
      res.status(403).json({ error: "Unauthorized: you didn't create this event" });
      return;
    }
  
    db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
    res.json({ message: "Event deleted", eventId });
    return;
  };
  
