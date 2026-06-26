import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Media, SearchResult } from '../models/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private apiUrl = `${environment.apiUrl}/media`;

  constructor(private http: HttpClient) {}

  search(query: string, type?: string, page = 1): Observable<SearchResult> {
    let params = new HttpParams().set('q', query).set('page', page.toString());
    if (type) params = params.set('type', type);
    return this.http.get<SearchResult>(`${this.apiUrl}/search`, { params });
  }

  getDetail(imdbId: string): Observable<Media> {
    return this.http.get<Media>(`${this.apiUrl}/${imdbId}`);
  }

  getTrending(type?: string): Observable<Media[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<Media[]>(`${this.apiUrl}/trending`, { params });
  }
}
