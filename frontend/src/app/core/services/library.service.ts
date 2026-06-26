import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LibraryImportRequest, LibraryItem, LibraryUpdateRequest } from '../models/library.model';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private apiUrl = `${environment.apiUrl}/library`;

  constructor(private http: HttpClient) {}

  getMyLibrary(): Observable<LibraryItem[]> {
    return this.http.get<LibraryItem[]>(`${this.apiUrl}/me`);
  }

  importComic(payload: LibraryImportRequest): Observable<LibraryItem> {
    return this.http.post<LibraryItem>(`${this.apiUrl}/import`, payload);
  }

  updateComic(imdbId: string, payload: LibraryUpdateRequest): Observable<LibraryItem> {
    return this.http.patch<LibraryItem>(`${this.apiUrl}/${imdbId}`, payload);
  }

  removeComic(imdbId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${imdbId}`);
  }
}
