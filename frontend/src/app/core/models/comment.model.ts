export interface Comment {
  id: number;
  user_id: number;
  media_id: number;
  parent_id?: number | null;
  content: string;
  username: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}
