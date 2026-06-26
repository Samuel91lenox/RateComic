import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private apiUrl = `${environment.apiUrl}/comments`;

  constructor(private http: HttpClient) {}

  getComments(imdbId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/${imdbId}`);
  }

  createComment(imdb_id: string, content: string, parent_id?: number): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, { imdb_id, content, parent_id });
  }

  updateComment(id: number, content: string): Observable<Comment> {
    return this.http.patch<Comment>(`${this.apiUrl}/${id}`, { content });
  }

  deleteComment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
