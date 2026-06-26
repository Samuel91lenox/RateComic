import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rating, RatingStats } from '../models/media.model';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private apiUrl = `${environment.apiUrl}/ratings`;

  constructor(private http: HttpClient) {}

  rate(imdb_id: string, score: number): Observable<Rating> {
    return this.http.post<Rating>(this.apiUrl, { imdb_id, score });
  }

  getStats(imdbId: string): Observable<RatingStats> {
    return this.http.get<RatingStats>(`${this.apiUrl}/${imdbId}`);
  }

  getMyRatings(): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.apiUrl}/me`);
  }

  deleteRating(imdbId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${imdbId}`);
  }
}
