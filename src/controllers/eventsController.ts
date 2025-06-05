import { Request, Response } from 'express';
import db from '../db';
import { Event, EventDetail } from '../types/eventTypes';

interface AuthRequest extends Request {
  user?: { id: number };
}

export const getEventsHandler = (req: AuthRequest, res: Response): void => {
  const { audience, search } = req.query;
  const userId = req.user?.id;

  if ((audience === "friends" || audience === "public") && !userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const conditions: string[] = [];
  const params: any[] = [];

  // Search condition
  let searchCondition = "";
  if (search && typeof search === "string") {
    const like = `%${search}%`;
    searchCondition = `
      AND (
        events.title LIKE ? OR
        events.description LIKE ? OR
        events.location LIKE ? OR
        events.date LIKE ?
      )
    `;
    params.push(like, like, like, like);
  }

  let audienceCondition = "";

  if (audience === "public") {
    audienceCondition = `
      (
        events.audience = 'public'
        OR (
          events.audience = 'friends'
          AND events.userId IN (
            SELECT user_id2 FROM friendships WHERE user_id1 = ? AND status = 'accepted'
            UNION
            SELECT user_id1 FROM friendships WHERE user_id2 = ? AND status = 'accepted'
          )
        )
      )
    `;
    params.unshift(userId, userId);
  } else if (audience === "friends") {
    audienceCondition = `
      (
        events.userId IN (
          SELECT user_id2 FROM friendships WHERE user_id1 = ? AND status = 'accepted'
          UNION
          SELECT user_id1 FROM friendships WHERE user_id2 = ? AND status = 'accepted'
        )
        AND (events.audience = 'public' OR events.audience = 'friends')
      )
    `;
    params.unshift(userId, userId);
  }

  try {
    const query = `
      SELECT 
        events.id,
        events.title,
        events.description,
        events.location,
        events.date,
        events.imageUrl AS image,
        events.maxAttendees,
        events.userId AS organizerId,
        users.name AS organizerName,
        users.profile_picture AS organizerAvatar,
        (
          SELECT COUNT(*) 
          FROM event_attendees 
          WHERE event_attendees.event_id = events.id
        ) AS attendees,
        (
          SELECT COUNT(*) 
          FROM event_interested 
          WHERE event_interested.event_id = events.id
        ) AS interested,
        (
          SELECT COUNT(*) 
          FROM event_comments 
          WHERE event_comments.event_id = events.id
        ) AS comments
      FROM events
      JOIN users ON users.id = events.userId
      WHERE ${audienceCondition}
      ${searchCondition}
      ORDER BY date ASC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



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
    db.prepare(`
      UPDATE events SET interested = interested + 1 WHERE id = ?
    `).run(eventId);
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
    db.prepare(`
      UPDATE events SET interested = interested - 1 WHERE id = ?
    `).run(eventId);
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

export const getEventById = (req: Request, res: Response): void => {
  const id = parseInt(req.params.id);

  const event = db.prepare(`
    SELECT e.id, e.title, e.description, e.location, e.date, e.imageUrl, e.maxAttendees, e.audience, e.interested, e.userId,
           u.name as organizer_name, u.profile_picture as organizer_avatar
    FROM events e
    JOIN users u ON u.id = e.userId
    WHERE e.id = ?
  `).get(id) as {
    id: number;
    title: string;
    description: string;
    location: string;
    date: string;
    imageUrl: string;
    maxAttendees: number;
    audience: 'public' | 'friends';
    interested: number;
    userId: number;
    organizer_name: string;
    organizer_avatar: string;
  };

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const attendees = db.prepare(`
    SELECT u.id, u.name, u.profile_picture as avatar
    FROM event_attendees ea
    JOIN users u ON u.id = ea.user_id
    WHERE ea.event_id = ?
  `).all(id) as EventDetail['attendees'];

  const commentsRaw = db.prepare(`
    SELECT ec.id, ec.content, ec.created_at as timestamp,
           u.id as user_id, u.name, u.profile_picture as avatar
    FROM event_comments ec
    JOIN users u ON u.id = ec.user_id
    WHERE ec.event_id = ?
    ORDER BY ec.created_at DESC
  `).all(id);

  const comments: EventDetail['comments'] = commentsRaw.map((c: any) => ({
    id: c.id,
    content: c.content,
    timestamp: c.timestamp,
    user: {
      id: c.user_id,
      name: c.name,
      avatar: c.avatar,
    },
  }));

  const result: EventDetail = {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    date: event.date,
    imageUrl: event.imageUrl,
    maxAttendees: event.maxAttendees,
    audience: event.audience,
    interested: event.interested,
    userId: event.userId,
    organizer: {
      id: event.userId,
      name: event.organizer_name,
      avatar: event.organizer_avatar,
    },
    attendees,
    comments,
  };

  res.json(result);
};

export const applyToEvent = (req: AuthRequest, res: Response): void => {
  const userId = req.user?.id;
  const { eventId } = req.body;

  if (!userId || typeof eventId !== 'number') {
    res.status(400).json({ error: 'Event ID is required' });
    return;
  }

  db.prepare(`
    INSERT OR IGNORE INTO event_applications (user_id, event_id, status)
    VALUES (?, ?, 'pending')
  `).run(userId, eventId);

  res.json({ message: 'Application submitted' });
};

export const respondToEventApplication = (req: AuthRequest, res: Response): void => {
  const { userId, eventId, decision } = req.body;

  if (!userId || !eventId || !['accepted', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'Valid userId, eventId, and decision are required' });
    return;
  }

  const result = db.prepare(`
    UPDATE event_applications
    SET status = ?
    WHERE user_id = ? AND event_id = ? AND status = 'pending'
  `).run(decision, userId, eventId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Application not found or already processed' });
    return;
  }

  res.json({ message: `Application ${decision}` });
};

export const getPendingApplications = (req: AuthRequest, res: Response): void => {
  const ownerId = req.user?.id;

  const rows = db.prepare(`
    SELECT ea.user_id, ea.event_id
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    WHERE ea.status = 'pending' AND e.userId = ?
  `).all(ownerId);

  res.json({ applications: rows });
};





