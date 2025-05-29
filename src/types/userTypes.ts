export interface User {
    id: number;
    name: string;
    email: string;
    profile_picture: string | null;
    cover_image: string | null;
    location: string | null;
    joined_date: string | null;
    website: string | null;
    bio: string | null;
    role: "admin" | "user";
    tags?: string[]; // optional, can be populated separately
  }
  
export type UserImage = {
    id: number;
    user_id: number;
    image_url: string;
    uploaded_at: string;
  };
  