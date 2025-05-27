export interface Chat {
    id: number;
    user1_id: number;
    user2_id: number;
    created_at: string; // SQLite stores DATETIME as ISO strings
  }

  export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    content: string;
    created_at: string;
  }
  
  