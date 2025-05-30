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
    tags?: string[]; // optional, can be populated separately
  }
  
export type UserImage = {
    id: number;
    user_id: number;
    image_url: string;
    uploaded_at: string;
  };
  
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  user_id1: number;
  user_id2: number;
  status: FriendshipStatus;
}
