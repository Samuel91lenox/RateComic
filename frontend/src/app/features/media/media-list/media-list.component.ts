import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MediaService } from '../../../core/services/media.service';
import { MediaSearchItem } from '../../../core/models/media.model';
import { I18nService } from '../../../core/services/i18n.service';
import { TPipe } from '../../../shared/pipes/t.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { LibraryService } from '../../../core/services/library.service';

@Component({
  selector: 'app-media-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatProgressSpinnerModule,
    MatChipsModule, MatSnackBarModule, TPipe,
  ],
  template: `
    <div class="rf-page rf-container">
      <h1 class="page-title">
        <mat-icon>explore</mat-icon>
        {{ 'mediaList.title' | t }}
      </h1>

      <!-- Buscador -->
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>{{ 'mediaList.searchPlaceholder' | t }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchCtrl" autocomplete="off">
          @if (searchCtrl.value) {
            <button mat-icon-button matSuffix (click)="searchCtrl.reset()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="type-select">
          <mat-label>{{ 'mediaList.genre' | t }}</mat-label>
          <mat-select [formControl]="genreCtrl">
            <mat-option value="">{{ 'mediaList.allGenres' | t }}</mat-option>
            @for (genre of genreOptions(); track genre) {
              <mat-option [value]="genre">{{ genre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Resultados -->
      @if (loading()) {
        <div class="loading-center">
          <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
        </div>
      } @else if (results().length > 0) {
        <div class="results-header">
          <span class="text-muted">{{ 'mediaList.resultsFor' | t:{ total: totalResults(), query: lastQuery() } }}</span>
        </div>
        <div class="media-grid">
          @for (item of results(); track item.imdbID) {
            <a [routerLink]="['/media', item.imdbID]" class="card-link">
              <div class="search-card rf-card">
                @if (item.Poster && item.Poster !== 'N/A') {
                  <img [src]="item.Poster" [alt]="item.Title" class="card-poster" loading="lazy">
                } @else {
                  <div class="poster-ph"><mat-icon>movie</mat-icon></div>
                }
                <div class="card-info">
                  <h3 class="card-title">{{ item.Title }}</h3>
                  <p class="text-muted">{{ item.Year || '-' }}</p>
                  <p class="text-muted genre-line" [class.type-indicator]="isCharacterItem(item)">
                    {{ isCharacterItem(item) ? ('mediaList.character' | t) : (item.Genre || '-') }}
                  </p>
                  @if (auth.isLoggedIn() && canAddToLibrary(item)) {
                    <button mat-stroked-button class="add-lib-btn" (click)="addToLibrary(item, $event)">
                      <span class="btn-label">
                        <mat-icon>library_add</mat-icon>
                        <span>{{ 'library.quickAdd' | t }}</span>
                      </span>
                    </button>
                  }
                </div>
              </div>
            </a>
          }
        </div>

        @if (loadingMore()) {
          <div class="loading-more">
            <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
          </div>
        } @else if (!hasMore()) {
          <div class="end-of-results text-muted">{{ 'mediaList.noMoreResults' | t }}</div>
        }
      } @else if (lastQuery()) {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>{{ 'mediaList.noResults' | t:{ query: lastQuery() } }}</p>
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>movie_filter</mat-icon>
          <p>{{ 'mediaList.startSearch' | t }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-title { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }

    .search-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .search-field { flex: 1; min-width: 280px; }
    .type-select { width: 160px; }

    .results-header { margin-bottom: 12px; }

    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .card-link { text-decoration: none; color: inherit; display: flex; height: 100%; }
    .search-card {
      cursor: pointer; overflow: hidden;
      display: flex; flex-direction: column;
      width: 100%; min-height: 370px;
      transition: transform 0.2s;
      &:hover { transform: translateY(-4px); }
    }
    .card-poster { width: 100%; height: 250px; object-fit: cover; display: block; flex-shrink: 0; }
    .poster-ph {
      width: 100%; height: 250px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--rf-surface-2);
      mat-icon { font-size: 56px; color: var(--rf-text-muted); }
    }
    .card-info { padding: 8px 12px 12px; display: flex; flex-direction: column; flex: 1; }
    .card-title { font-size: 0.9rem; margin: 0 0 4px; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .genre-line {
      margin: 0;
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .type-indicator {
      margin: 0;
      font-size: 0.72rem;
      color: var(--rf-accent);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .add-lib-btn {
      width: 100%;
      margin-top: auto;
      padding-top: 14px;
      font-size: 0.75rem;
      min-height: 30px;
      height: auto;
      line-height: 1.2;
      white-space: normal;
      text-align: center;
    }
    .add-lib-btn .btn-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      text-align: center;
    }
    .add-lib-btn mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }

    .loading-center { display: flex; justify-content: center; padding: 64px; }
    .loading-more { display: flex; justify-content: center; padding: 24px; }
    .end-of-results { text-align: center; padding: 24px; font-size: 0.85rem; }

    .empty-state, .error-state {
      text-align: center; padding: 64px 16px;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--rf-text-muted); }
      p { color: var(--rf-text-muted); }
    }
    .error-state mat-icon { color: #f44336; }
  `],
})
export class MediaListComponent implements OnInit {
  private mediaSvc = inject(MediaService);
  readonly auth = inject(AuthService);
  private librarySvc = inject(LibraryService);
  private i18n = inject(I18nService);
  private snack = inject(MatSnackBar);

  searchCtrl = new FormControl('');
  genreCtrl = new FormControl('');

  private readonly allGenresCatalog: string[] = [
    'Action', 'Adventure', 'Comedy', 'Crime', 'Drama', 'Fantasy',
    'Graphic Novel', 'Historical', 'Horror', 'Manga', 'Mystery',
    'Romance', 'Sci-Fi', 'Superhero', 'Suspense', 'Terror', 'Thriller',
  ];

  rawResults   = signal<MediaSearchItem[]>([]);
  results      = signal<MediaSearchItem[]>([]);
  genreOptions = signal<string[]>(this.allGenresCatalog);
  totalResults = signal(0);
  loading      = signal(false);
  error        = signal<string | null>(null);
  lastQuery    = signal('');
  currentPage  = signal(1);
  loadingMore  = signal(false);
  readonly pageSize = 20;
  readonly hasMore = computed(() => this.results().length < this.totalResults());

  ngOnInit() {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.doSearch(true);
    });

    this.genreCtrl.valueChanges.subscribe(() => {
      this.doSearch(true);
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.loading() || this.loadingMore() || !this.hasMore() || !this.lastQuery()) {
      return;
    }
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 300;
    if (scrollPosition >= threshold) {
      this.currentPage.update(page => page + 1);
      this.doSearch(false);
    }
  }

  private doSearch(reset: boolean) {
    const q = this.searchCtrl.value?.trim();
    const genre = this.genreCtrl.value?.trim();
    const hasText = !!(q && q.length >= 2);

    // Si hay texto y género: combinar ambos para refinar la búsqueda en el backend
    // Si solo género: buscar por el género
    // Si solo texto: buscar por el texto
    let effectiveQuery = '';
    if (hasText && genre) {
      effectiveQuery = `${q} ${genre}`;
    } else if (hasText) {
      effectiveQuery = q!;
    } else if (genre) {
      effectiveQuery = genre;
    }

    if (!effectiveQuery) {
      this.rawResults.set([]);
      this.results.set([]);
      this.totalResults.set(0);
      this.lastQuery.set('');
      this.currentPage.set(1);
      return;
    }

    if (reset) {
      this.currentPage.set(1);
      this.rawResults.set([]);
      this.results.set([]);
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.error.set(null);
    this.lastQuery.set(effectiveQuery);

    this.mediaSvc.search(effectiveQuery, undefined, this.currentPage()).subscribe({
      next: (data) => {
        this.rawResults.update(prev => reset ? data.results : [...prev, ...data.results]);
        this.buildAvailableGenres();
        // Nunca filtrar client-side por género: la query ya lo incluye
        this.results.set(this.rawResults());
        this.totalResults.set(data.totalResults);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        this.error.set(this.i18n.translateApiError(err, 'mediaList.searchError'));
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  addToLibrary(item: MediaSearchItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canAddToLibrary(item)) {
      return;
    }

    this.librarySvc.importComic({ code: item.imdbID }).subscribe({
      next: () => this.snack.open(this.i18n.t('library.added'), this.i18n.t('auth.close'), { duration: 2000 }),
      error: (err) => {
        const message = this.i18n.translateApiError(err, 'library.addError');
        this.snack.open(message, this.i18n.t('auth.close'), { duration: 2500 });
      },
    });
  }

  private applyGenreFilter(fallbackTotal?: number) {
    const genre = this.genreCtrl.value || '';
    const rows = this.rawResults();

    if (!genre) {
      this.results.set(rows);
      if (fallbackTotal !== undefined) {
        this.totalResults.set(fallbackTotal);
      }
      return;
    }

    const filtered = rows.filter(item => (item.Genre || '').toLowerCase() === genre.toLowerCase());
    this.results.set(filtered);
    this.totalResults.set(filtered.length);
  }

  buildAvailableGenres() {
    const counts = new Map<string, number>();
    for (const item of this.rawResults()) {
      const genre = (item.Genre || '').trim();
      if (!genre) continue;
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }

    const dynamicGenres = Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], 'es');
      })
      .map(entry => entry[0]);

    const mergedGenres = Array.from(new Set([...dynamicGenres, ...this.allGenresCatalog]));
    this.genreOptions.set(mergedGenres);

    const selectedGenre = (this.genreCtrl.value || '').trim();
    if (selectedGenre && !mergedGenres.some(genre => genre.toLowerCase() === selectedGenre.toLowerCase())) {
      this.genreCtrl.setValue('', { emitEvent: false });
    }
  }

  canAddToLibrary(item: MediaSearchItem): boolean {
    const type = String(item.Type || '').toLowerCase();
    if (type) {
      return type === 'comic';
    }

    const id = String(item.imdbID || '').toLowerCase();
    return !id.includes('character');
  }

  isCharacterItem(item: MediaSearchItem): boolean {
    const type = String(item.Type || '').toLowerCase();
    if (type) {
      return type === 'character';
    }

    const id = String(item.imdbID || '').toLowerCase();
    return id.includes('character');
  }
}
