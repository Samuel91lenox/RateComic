import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LibraryService } from '../../core/services/library.service';
import { I18nService } from '../../core/services/i18n.service';
import { LibraryItem } from '../../core/models/library.model';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { TPipe } from '../../shared/pipes/t.pipe';

type MaybeBarcodeDetector = {
  new (options?: { formats?: string[] }): { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
};

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    StarRatingComponent,
    TPipe,
  ],
  template: `
    <section class="rf-container library-page">
      <header class="library-header">
        <h1>{{ 'library.title' | t }}</h1>
        <p class="text-muted">{{ 'library.subtitle' | t }}</p>
      </header>

      <mat-card class="rf-card add-card">
        <div class="add-row">
          <mat-form-field appearance="outline" class="code-field">
            <mat-label>{{ 'library.codeLabel' | t }}</mat-label>
            <input matInput [placeholder]="i18n.t('library.codePlaceholder')" [formControl]="codeCtrl">
          </mat-form-field>

          <button mat-raised-button color="primary" (click)="addComic()" [disabled]="adding() || codeCtrl.invalid">
            <mat-icon>add</mat-icon>
            {{ 'library.addComic' | t }}
          </button>

          @if (scanSupported()) {
            <button mat-stroked-button (click)="toggleScanner()" [disabled]="adding()">
              <mat-icon>qr_code_scanner</mat-icon>
              {{ scanning() ? ('library.scanStop' | t) : ('library.scanStart' | t) }}
            </button>
          }
        </div>

        @if (scanning()) {
          <p class="text-muted scanner-help">{{ 'library.scannerInstructions' | t }}</p>
          <video #scannerVideo autoplay playsinline muted class="scanner-video"></video>
        }
      </mat-card>

      @if (loading()) {
        <div class="loading-wrap">
          <mat-progress-spinner mode="indeterminate" diameter="44"></mat-progress-spinner>
        </div>
      } @else if (items().length === 0) {
        <mat-card class="rf-card empty-card">
          <mat-icon>menu_book</mat-icon>
          <p>{{ 'library.empty' | t }}</p>
        </mat-card>
      } @else {
        <div class="library-grid">
          @for (item of items(); track item.library_id) {
            <mat-card class="rf-card library-item">
              <a class="item-head" [routerLink]="['/media', item.media.imdb_id]">
                @if (item.media.poster_url) {
                  <img class="item-poster" [src]="item.media.poster_url" [alt]="item.media.title">
                } @else {
                  <div class="item-poster empty-poster">
                    <mat-icon>book</mat-icon>
                  </div>
                }
                <div class="item-meta">
                  <h3>{{ item.media.title }}</h3>
                  <p class="text-muted">{{ item.media.year || '-' }}</p>
                  <p class="text-muted">★ {{ item.media.avg_score ?? '-' }}/10 · {{ item.media.total_votes ?? 0 }} votos</p>
                </div>
              </a>

              <div class="item-actions">
                <mat-slide-toggle
                  [checked]="item.read_status"
                  (change)="setReadStatus(item, $event.checked)">
                  {{ item.read_status ? ('library.read' | t) : ('library.unread' | t) }}
                </mat-slide-toggle>

                <div class="my-rating">
                  <span>{{ 'library.yourScore' | t }}</span>
                  <app-star-rating
                    [value]="item.personal_score ?? 0"
                    [showValue]="true"
                    (rated)="setPersonalScore(item, $event)"
                  />
                </div>

                <button mat-button color="warn" class="remove-btn" (click)="remove(item)">
                  <span class="btn-label">
                    <mat-icon>delete</mat-icon>
                    <span>{{ 'library.remove' | t }}</span>
                  </span>
                </button>
              </div>
            </mat-card>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .library-page { padding: 28px 16px 56px; }
    .library-header { margin-bottom: 16px; }
    .library-header h1 { margin: 0 0 8px; }
    .add-card { padding: 16px; margin-bottom: 20px; }
    .add-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .code-field { min-width: 280px; flex: 1; }
    .scanner-help { margin: 8px 0; }
    .scanner-video {
      width: 100%;
      max-width: 420px;
      border-radius: 8px;
      border: 1px solid var(--rf-border);
      background: #000;
    }
    .loading-wrap { display: flex; justify-content: center; padding: 40px; }
    .empty-card { padding: 24px; text-align: center; }
    .empty-card mat-icon { font-size: 46px; width: 46px; height: 46px; color: var(--rf-text-muted); }
    .library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .library-item { padding: 14px; display: flex; flex-direction: column; min-height: 220px; }
    .item-head {
      display: flex; gap: 12px;
      text-decoration: none; color: inherit;
      &:hover .item-meta h3 { text-decoration: underline; }
    }
    .item-poster { width: 76px; height: 108px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .empty-poster {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--rf-surface-2);
    }
    .item-meta { flex: 1; }
    .item-meta h3 { margin: 0 0 6px; font-size: 1rem; }
    .item-meta p { margin: 0 0 4px; }
    .item-actions { display: flex; flex-direction: column; gap: 10px; margin-top: auto; padding-top: 16px; }
    .item-actions button { text-align: center; }
    .item-actions .btn-label {
      display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
    }
    .my-rating { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  `],
})
export class LibraryComponent implements OnInit, OnDestroy {
  private readonly libraryService = inject(LibraryService);
  readonly i18n = inject(I18nService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly adding = signal(false);
  readonly items = signal<LibraryItem[]>([]);
  readonly scanSupported = signal(typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices);
  readonly scanning = signal(false);

  readonly codeCtrl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(64)],
  });

  private scannerStream: MediaStream | null = null;
  private scannerInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadLibrary();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  loadLibrary() {
    this.loading.set(true);
    this.libraryService.getMyLibrary().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  addComic() {
    const code = this.codeCtrl.value.trim();
    if (!code) {
      return;
    }

    this.adding.set(true);
    this.libraryService.importComic({ code }).subscribe({
      next: () => {
        this.codeCtrl.setValue('');
        this.loadLibrary();
        this.adding.set(false);
        this.snackBar.open(this.i18n.t('library.added'), this.i18n.t('auth.close'), { duration: 2400 });
      },
      error: error => {
        this.adding.set(false);
        const message = this.i18n.translateApiError(error, 'library.addError');
        this.snackBar.open(message, this.i18n.t('auth.close'), { duration: 3000 });
      },
    });
  }

  setReadStatus(item: LibraryItem, checked: boolean) {
    this.libraryService.updateComic(item.media.imdb_id, { read_status: checked }).subscribe({
      next: () => {
        this.items.update(rows => rows.map(row =>
          row.library_id === item.library_id ? { ...row, read_status: checked } : row
        ));
      },
      error: error => {
        const message = this.i18n.translateApiError(error, 'library.updateError');
        this.snackBar.open(message, this.i18n.t('auth.close'), { duration: 2400 });
      },
    });
  }

  setPersonalScore(item: LibraryItem, score: number) {
    this.libraryService.updateComic(item.media.imdb_id, { personal_score: score }).subscribe({
      next: () => {
        this.items.update(rows => rows.map(row =>
          row.library_id === item.library_id ? { ...row, personal_score: score } : row
        ));
      },
      error: error => {
        const message = this.i18n.translateApiError(error, 'library.updateError');
        this.snackBar.open(message, this.i18n.t('auth.close'), { duration: 2400 });
      },
    });
  }

  remove(item: LibraryItem) {
    this.libraryService.removeComic(item.media.imdb_id).subscribe({
      next: () => {
        this.items.update(rows => rows.filter(row => row.library_id !== item.library_id));
        this.snackBar.open(this.i18n.t('library.removed'), this.i18n.t('auth.close'), { duration: 2000 });
      },
      error: error => {
        const message = this.i18n.translateApiError(error, 'library.updateError');
        this.snackBar.open(message, this.i18n.t('auth.close'), { duration: 2400 });
      },
    });
  }

  async toggleScanner() {
    if (this.scanning()) {
      this.stopScanner();
      return;
    }

    if (!this.scanSupported()) {
      this.snackBar.open(this.i18n.t('library.notSupportedScanner'), this.i18n.t('auth.close'), { duration: 2400 });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      this.scannerStream = stream;
      this.scanning.set(true);

      const video = document.querySelector('.scanner-video') as HTMLVideoElement | null;
      if (!video) {
        this.stopScanner();
        return;
      }
      video.srcObject = stream;
      await video.play();

      const Detector = (window as unknown as { BarcodeDetector?: MaybeBarcodeDetector }).BarcodeDetector;
      if (!Detector) return;
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });

      this.scannerInterval = setInterval(async () => {
        if (!this.scanning()) return;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            this.codeCtrl.setValue(value);
            this.stopScanner();
            this.addComic();
          }
        } catch (_) {
          // ignoramos errores de fotograma puntual.
        }
      }, 500);
    } catch {
      this.stopScanner();
      this.snackBar.open(this.i18n.t('library.notSupportedScanner'), this.i18n.t('auth.close'), { duration: 2400 });
    }
  }

  private stopScanner() {
    if (this.scannerInterval) {
      clearInterval(this.scannerInterval);
      this.scannerInterval = null;
    }

    if (this.scannerStream) {
      this.scannerStream.getTracks().forEach(track => track.stop());
      this.scannerStream = null;
    }

    this.scanning.set(false);
  }
}
