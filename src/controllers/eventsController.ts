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

export const getUserEvents = (req: Request, res: Response):void => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const events = db.prepare(`
    SELECT 
      e.id, e.title, e.description, e.location, e.date, e.imageUrl as image,
      e.maxAttendees, e.interested,
      u.id as organizerId, u.name as organizerName, u.profile_picture as organizerAvatar,
      (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendees,
      (SELECT COUNT(*) FROM event_comments WHERE event_id = e.id) as comments
    FROM events e
    JOIN users u ON e.userId = u.id
    WHERE e.userId = ?
    ORDER BY e.date DESC
  `).all(userId);

  res.json(events);
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
      image,
    } = req.body;

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
      image,
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


export const markInterested = (req: Request, res: Response): void => {
  const eventId = parseInt(req.params.id);
  const userId = (req as any).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO event_interested (user_id, event_id)
      VALUES (?, ?)
    `);
    stmt.run(userId, eventId);
    res.status(200).json({ message: 'Marked as interested' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const unmarkInterested = (req: Request, res: Response): void => {
  const eventId = parseInt(req.params.id);
  const userId = (req as any).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return; 
  }

  try {
    const stmt = db.prepare(`
      DELETE FROM event_interested WHERE user_id = ? AND event_id = ?
    `);
    stmt.run(userId, eventId);
    res.status(200).json({ message: 'Removed interest' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const checkInterested = (req: Request, res: Response): void => {
  const eventId = parseInt(req.params.id);
  const userId = (req as any).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const stmt = db.prepare(`
      SELECT 1 FROM event_interested WHERE user_id = ? AND event_id = ?
    `);
    const row = stmt.get(userId, eventId);

    res.json({ interested: !!row });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const getEventCardData = (req: Request, res: Response): void => {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) {
    res.status(400).json({ error: 'Invalid event ID' });
    return;
  }

  const event = db.prepare(`
    SELECT 
      e.id, e.title, e.description, e.location, e.date, e.imageUrl as image,
      e.maxAttendees, e.interested,
      u.id as organizerId, u.name as organizerName, u.avatar as organizerAvatar
    FROM events e
    JOIN users u ON e.userId = u.id
    WHERE e.id = ?
  `).get(eventId) as Event;

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  } 

  const attendeesRow = db.prepare(`
    SELECT COUNT(*) as count FROM event_attendees WHERE event_id = ?
  `).get(eventId) as {count: number};

  const commentsRow = db.prepare(`
    SELECT COUNT(*) as count FROM event_comments WHERE event_id = ?
  `).get(eventId) as {count: number};

  const attendees = attendeesRow.count;
  const comments = commentsRow.count;

  res.json({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    date: event.date,
    image: event.image,
    organizer: {
      id: event.organizer.id,
      name: event.organizer.name,
      avatar: event.organizer.avatar
    },
    attendees,
    maxAttendees: event.maxAttendees,
    interested: event.interested,
    comments
  });
};


