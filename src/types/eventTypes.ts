export interface Event {
    id: number;
    title: string;
    description: string;
    location: string;
    date: string;
    image: string | null;
    maxAttendees?: number;
    audience: 'public' | 'friends';
    organizer: {
      id: number;
      name: string;
      avatar: string | null;
    };
    attendees: number;
    interested: number;
    comments: number;
  }
  