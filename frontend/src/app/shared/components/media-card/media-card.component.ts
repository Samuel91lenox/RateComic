import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Media } from '../../../core/models/media.model';
import { TPipe } from '../../pipes/t.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { LibraryService } from '../../../core/services/library.service';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatChipsModule, MatIconModule, MatButtonModule, MatSnackBarModule, TPipe],
  template: `
    <mat-card class="media-card rf-card" [routerLink]="['/media', media.imdb_id]" role="article">
      <div class="poster-wrapper">
        @if (media.poster_url) {
          <img [src]="media.poster_url" [alt]="'mediaCard.posterAlt' | t:{ title: media.title }" class="poster" loading="lazy">
        } @else {
          <div class="poster-placeholder">
            <mat-icon>movie</mat-icon>
          </div>
        }
      </div>

      <mat-card-content class="card-content">
        <h3 class="title" [title]="media.title">{{ media.title }}</h3>
        <p class="text-muted">{{ media.year || '-' }}</p>

        <div class="rating-row">
          @if (communityScore() !== null) {
            <mat-icon class="star-icon">star</mat-icon>
            <span class="avg">{{ communityStars() }}/10</span>
            <span class="votes text-muted">{{ 'mediaCard.votes' | t:{ votes: communityVotes() } }}</span>
          } @else if (media.imdb_rating) {
            <mat-icon class="star-icon imdb">star</mat-icon>
            <span class="avg">{{ media.imdb_rating }}</span>
            <span class="votes text-muted">IMDB</span>
          } @else {
            <span class="avg text-muted">-</span>
          }
        </div>

        @if (auth.isLoggedIn() && canAddToLibrary()) {
          @if (inLibraryState()) {
            <button mat-stroked-button color="warn" class="add-lib-btn" (click)="removeFromLibrary($event)">
              <span class="btn-label">
                <mat-icon>library_add_check</mat-icon>
                <span>{{ 'library.removeFromLibrary' | t }}</span>
              </span>
            </button>
          } @else {
            <button mat-stroked-button class="add-lib-btn" (click)="addToLibrary($event)">
              <span class="btn-label">
                <mat-icon>library_add</mat-icon>
                <span>{{ 'library.quickAdd' | t }}</span>
              </span>
            </button>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .media-card {
      cursor: pointer;
      width: 180px;
      display: flex;
      flex-direction: column;
      min-height: 375px;
      transition: transform 0.2s;
      &:hover { transform: translateY(-4px); }
    }
    .poster-wrapper { position: relative; flex-shrink: 0; }
    .poster { width: 100%; height: 265px; object-fit: cover; display: block; }
    .poster-placeholder {
      width: 100%; height: 265px;
      display: flex; align-items: center; justify-content: center;
      background: var(--rf-surface-2);
      mat-icon { font-size: 64px; color: var(--rf-text-muted); }
    }
    .card-content { padding: 8px 12px 12px !important; display: flex; flex-direction: column; flex: 1; }
    .title {
      font-size: 0.9rem; font-weight: 500;
      margin: 0 0 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rating-row { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
    .star-icon { color: var(--rf-star-filled); font-size: 14px; width: 14px; height: 14px; }
    .star-icon.imdb { color: #f5c518; }
    .avg { font-weight: 600; font-size: 0.85rem; }
    .votes { font-size: 0.75rem; }
    .add-lib-btn {
      width: 100%;
      margin-top: auto;
      padding-top: 14px;
      min-height: 30px;
      height: auto;
      font-size: 0.75rem;
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
  `],
})
export class MediaCardComponent implements OnChanges {
  @Input({ required: true }) media!: Media;
  @Input() inLibrary = false;

  readonly auth = inject(AuthService);
  private readonly librarySvc = inject(LibraryService);
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(I18nService);

  readonly inLibraryState = signal(false);

  ngOnChanges() {
    this.inLibraryState.set(this.inLibrary);
  }

  communityScore(): number | null {
    if (this.media.rating_stats?.avg_score != null) {
      return this.media.rating_stats.avg_score;
    }

    if (this.media.avg_score != null) {
      return Number(this.media.avg_score);
    }

    return null;
  }

  communityVotes(): number {
    if (this.media.rating_stats?.total_votes != null) {
      return this.media.rating_stats.total_votes;
    }

    return this.media.total_votes ?? 0;
  }

  communityStars(): string {
    const score = this.communityScore();
    if (score == null) {
      return '0.0';
    }

    return Number(score).toFixed(1);
  }

  addToLibrary(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.canAddToLibrary()) {
      return;
    }

    this.librarySvc.importComic({ code: this.media.imdb_id }).subscribe({
      next: () => {
        this.inLibraryState.set(true);
        this.snack.open(this.i18n.t('library.added'), this.i18n.t('auth.close'), { duration: 2000 });
      },
      error: (err) => {
        const message = this.i18n.translateApiError(err, 'library.addError');
        this.snack.open(message, this.i18n.t('auth.close'), { duration: 2500 });
      },
    });
  }

  removeFromLibrary(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    this.librarySvc.removeComic(this.media.imdb_id).subscribe({
      next: () => {
        this.inLibraryState.set(false);
        this.snack.open(this.i18n.t('library.removed'), this.i18n.t('auth.close'), { duration: 2000 });
      },
      error: (err) => {
        const message = this.i18n.translateApiError(err, 'library.removeError');
        this.snack.open(message, this.i18n.t('auth.close'), { duration: 2500 });
      },
    });
  }

  canAddToLibrary(): boolean {
    const type = String(this.media.type || '').toLowerCase();
    if (type) {
      return type === 'comic';
    }

    const id = String(this.media.imdb_id || '').toLowerCase();
    return !id.includes('character');
  }
}
