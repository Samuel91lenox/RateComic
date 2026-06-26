import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LibraryComponent } from './library.component';
import { LibraryService } from '../../core/services/library.service';
import { LibraryItem } from '../../core/models/library.model';

class MockLibraryService {
  getMyLibrary() {
    return of<LibraryItem[]>([
      {
        library_id: 1,
        user_id: 1,
        media_id: 10,
        read_status: false,
        personal_score: 7,
        source_code: 'cv-issue-123',
        library_created_at: new Date().toISOString(),
        library_updated_at: new Date().toISOString(),
        media: {
          id: 10,
          imdb_id: 'cv-issue-123',
          title: 'Deadpool',
          type: 'comic',
          avg_score: 8.2,
          total_votes: 16,
        } as any,
      },
    ]);
  }

  importComic() { return of({} as any); }
  updateComic() { return of({} as any); }
  removeComic() { return of(void 0); }
}

describe('LibraryComponent', () => {
  let fixture: ComponentFixture<LibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibraryService, useClass: MockLibraryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryComponent);
    fixture.detectChanges();
  });

  it('renders loaded comics in library list', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Deadpool');
    expect(text).toContain('8.2/10');
  });
});
