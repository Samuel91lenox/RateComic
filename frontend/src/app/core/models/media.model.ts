export interface Media {
  id: number;
  imdb_id: string;
  title: string;
  type: 'movie' | 'series' | 'book' | 'comic' | 'character';
  year?: string;
  rated?: string;
  released?: string;
  runtime?: string;
  genre?: string;
  director?: string;
  writer?: string;
  actors?: string;
  plot?: string;
  poster_url?: string;
  imdb_rating?: number;
  imdb_votes?: string;
  total_seasons?: string;
  language?: string;
  country?: string;
  awards?: string;
  cached_at?: string;
  rating_stats?: RatingStats;
  avg_score?: number | null;
  total_votes?: number;
}

export interface RatingStats {
  avg_score: number | null;
  total_votes: number;
  distribution: { score: number; count: number }[];
}

export interface Rating {
  id: number;
  user_id: number;
  media_id: number;
  score: number;
  created_at: string;
  updated_at: string;
  // Campos adicionales cuando se listan las valoraciones del usuario
  title?: string;
  type?: string;
  poster_url?: string;
  imdb_id?: string;
}

export interface SearchResult {
  results: MediaSearchItem[];
  totalResults: number;
}

export interface MediaSearchItem {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Genre?: string;
  Poster: string;
}
