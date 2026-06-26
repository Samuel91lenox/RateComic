import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MediaCardComponent } from './media-card.component';
import { LibraryService } from '../../../core/services/library.service';
import { AuthService } from '../../../core/services/auth.service';

class MockLibraryService {
  importComic = jasmine.createSpy('importComic').and.returnValue(of({}));
}

describe('MediaCardComponent', () => {
  let fixture: ComponentFixture<MediaCardComponent>;
  let component: MediaCardComponent;
  let libraryService: MockLibraryService;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaCardComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LibraryService, useClass: MockLibraryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaCardComponent);
    component = fixture.componentInstance;
    libraryService = TestBed.inject(LibraryService) as unknown as MockLibraryService;
    auth = TestBed.inject(AuthService);

    auth.currentUser.set({
      id: 1,
      username: 'samuel',
      email: 'samuel@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
    });

    component.media = {
      id: 1,
      imdb_id: 'cv-issue-321',
      title: 'Deadpool',
      type: 'comic',
      year: '2024',
      avg_score: 8.3,
      total_votes: 10,
    } as any;

    fixture.detectChanges();
  });

  it('shows quick add button for logged comic cards', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Anadir a biblioteca');
  });

  it('calls library import when quick add is clicked', () => {
    const button = fixture.nativeElement.querySelector('.add-lib-btn') as HTMLButtonElement;
    button.click();

    expect(libraryService.importComic).toHaveBeenCalledWith({ code: 'cv-issue-321' });
  });
});
