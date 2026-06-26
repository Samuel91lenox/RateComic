import { Media } from './media.model';

export interface LibraryItem {
  library_id: number;
  user_id: number;
  media_id: number;
  read_status: boolean;
  personal_score: number | null;
  source_code: string | null;
  library_created_at: string;
  library_updated_at: string;
  media: Media;
}

export interface LibraryImportRequest {
  code?: string;
  barcode?: string;
  read_status?: boolean;
  personal_score?: number | null;
}

export interface LibraryUpdateRequest {
  read_status?: boolean;
  personal_score?: number | null;
}
