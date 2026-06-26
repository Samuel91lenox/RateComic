import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MediaListComponent } from './media-list.component';
import { MediaService } from '../../../core/services/media.service';
import { LibraryService } from '../../../core/services/library.service';

class MockMediaService {
  search() {
    return of({ results: [], totalResults: 0 });
  }
}

class MockLibraryService {
  importComic() {
    return of({});
  }
}

describe('MediaListComponent', () => {
  let fixture: ComponentFixture<MediaListComponent>;
  let component: MediaListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MediaService, useClass: MockMediaService },
        { provide: LibraryService, useClass: MockLibraryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('filters current results by selected genre and triggers a search', () => {
    const mockItems = [
      { imdbID: 'cv-issue-1', Title: 'A', Year: '2024', Type: 'comic', Genre: 'Superhero', Poster: 'N/A' },
      { imdbID: 'mv-comic-2', Title: 'B', Year: '2023', Type: 'comic', Genre: 'Mystery', Poster: 'N/A' },
      { imdbID: 'ol-work-3', Title: 'C', Year: '2022', Type: 'comic', Genre: 'Superhero', Poster: 'N/A' },
    ];
    const mediaSvc = TestBed.inject(MediaService);
    spyOn(mediaSvc, 'search').and.returnValue(of({ results: mockItems, totalResults: mockItems.length }));

    component.genreCtrl.setValue('Superhero');
    fixture.detectChanges();

    // Solo género: busca por el género y muestra todos los resultados
    expect(mediaSvc.search).toHaveBeenCalledWith('Superhero', undefined, 1);
    expect(component.results().length).toBe(3);
  });

  it('combines text and genre in the query when both are set', fakeAsync(() => {
    const mockItems = [
      { imdbID: 'cv-issue-1', Title: 'Batman', Year: '2024', Type: 'comic', Genre: 'Superhero', Poster: 'N/A' },
    ];
    const mediaSvc = TestBed.inject(MediaService);
    spyOn(mediaSvc, 'search').and.returnValue(of({ results: mockItems, totalResults: 1 }));

    component.genreCtrl.setValue('Superhero', { emitEvent: false });
    component.searchCtrl.setValue('batman');
    tick(500); // avanzar debounceTime
    fixture.detectChanges();

    expect(mediaSvc.search).toHaveBeenCalledWith('batman Superhero', undefined, 1);
    expect(component.results().length).toBe(1);
  }));

  it('orders available genres by frequency (desc)', () => {
    component.rawResults.set([
      { imdbID: 'cv-issue-1', Title: 'A', Year: '2024', Type: 'comic', Genre: 'Mystery', Poster: 'N/A' },
      { imdbID: 'mv-comic-2', Title: 'B', Year: '2023', Type: 'comic', Genre: 'Superhero', Poster: 'N/A' },
      { imdbID: 'ol-work-3', Title: 'C', Year: '2022', Type: 'comic', Genre: 'Mystery', Poster: 'N/A' },
      { imdbID: 'cv-issue-4', Title: 'D', Year: '2021', Type: 'comic', Genre: 'Mystery', Poster: 'N/A' },
      { imdbID: 'mv-comic-5', Title: 'E', Year: '2020', Type: 'comic', Genre: 'Sci-Fi', Poster: 'N/A' },
      { imdbID: 'ol-work-6', Title: 'F', Year: '2019', Type: 'comic', Genre: 'Superhero', Poster: 'N/A' },
    ]);

    component.buildAvailableGenres();

    expect(component.genreOptions().slice(0, 3)).toEqual(['Mystery', 'Superhero', 'Sci-Fi']);
  });

  it('keeps full genre catalog visible even with no search results', () => {
    component.rawResults.set([]);
    component.buildAvailableGenres();

    expect(component.genreOptions().length).toBeGreaterThan(5);
    expect(component.genreOptions()).toContain('Horror');
    expect(component.genreOptions()).toContain('Terror');
  });
});
