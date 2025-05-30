import { Request, Response } from 'express';
import db from '../db';
import { Event } from '../types/eventTypes';

export const getPublicEvents = (req: Request, res: Response) => {
  try {
    const stmt = db.prepare(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.location,
        e.date,
        e.imageUrl AS image,
        e.maxAttendees,
        e.audience,
        e.userId AS organizerId,
        u.name AS organizerName,
        u.profile_picture AS organizerAvatar,
        e.interested,
        (
          SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id
        ) AS attendees,
        (
          SELECT COUNT(*) FROM event_comments WHERE event_id = e.id
        ) AS comments
      FROM events e
      JOIN users u ON e.userId = u.id
      WHERE e.audience = 'public'
      ORDER BY e.date DESC
    `);

    const rows = stmt.all();

    const events = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      date: row.date,
      image: row.image,
      maxAttendees: row.maxAttendees,
      audience: row.audience,
      interested: row.interested,
      attendees: row.attendees,
      comments: row.comments,
      organizer: {
        id: row.organizerId,
        name: row.organizerName,
        avatar: row.organizerAvatar,
      },
    }));

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};



export const getEventById = (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const stmt = db.prepare(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.location,
        e.date,
        e.imageUrl AS image,
        e.maxAttendees,
        e.audience,
        e.userId AS organizerId,
        u.name AS organizerName,
        u.profile_picture AS organizerAvatar,
        e.interested,
        (
          SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id
        ) AS attendees,
        (
          SELECT COUNT(*) FROM event_comments WHERE event_id = e.id
        ) AS comments
      FROM events e
      JOIN users u ON e.userId = u.id
      WHERE e.id = ?
    `);

    const row = stmt.get(id) as Event;

    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = {
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      date: row.date,
      image: row.image,
      maxAttendees: row.maxAttendees,
      audience: row.audience,
      interested: row.interested,
      attendees: row.attendees,
      comments: row.comments,
      organizer: {
        id: row.organizer.id,
        name: row.organizer.name,
        avatar: row.organizer.avatar,
      },
    };

    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const createEvent = (req: Request, res: Response): void => {
  try {
    const {
      title,
      description,
      date,
      location,
      audience = 'public',
      maxAttendees,
    } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const userId = (req as any).user?.id;

    if (!title || !description || !date || !location) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO events (title, description, date, imageUrl, audience, userId, location, maxAttendees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      description,
      date,
      imageUrl,
      audience,
      userId,
      location,
      maxAttendees ? parseInt(maxAttendees) : null
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


// export const deleteEvent = (req: Request, res: Response) => {
//   try {
//     const id = parseInt(req.params.id);
//     const userId = (req as any).user?.id;

//     if (!userId) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const getStmt = db.prepare('SELECT userId FROM events WHERE id = ?');
//     const event = getStmt.get(id);

//     if (!event) {
//       return res.status(404).json({ error: 'Event not found' });
//     }

//     if (event.userId !== userId) {
//       return res.status(403).json({ error: 'You are not allowed to delete this event' });
//     }

//     const deleteStmt = db.prepare('DELETE FROM events WHERE id = ?');
//     deleteStmt.run(id);

//     res.status(200).json({ message: 'Event deleted successfully' });
//   } catch (err: any) {
//     res.status(500).json({ error: err.message });
//   }
// };
