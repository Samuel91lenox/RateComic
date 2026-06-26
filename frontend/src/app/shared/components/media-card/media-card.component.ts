import { Component, Input, inject } from '@angular/core';
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
        <p class="text-muted">{{ media.year }}</p>

        @if (communityScore() !== null) {
          <div class="rating-row">
            <mat-icon class="star-icon">star</mat-icon>
            <span class="avg">{{ communityStars() }}/10</span>
            <span class="votes text-muted">{{ 'mediaCard.votes' | t:{ votes: communityVotes() } }}</span>
          </div>
        } @else if (media.imdb_rating) {
          <div class="rating-row">
            <mat-icon class="star-icon imdb">star</mat-icon>
            <span class="avg">{{ media.imdb_rating }}</span>
            <span class="votes text-muted">IMDB</span>
          </div>
        }

        @if (auth.isLoggedIn() && canAddToLibrary()) {
          <button mat-stroked-button class="add-lib-btn" (click)="addToLibrary($event)">
            <mat-icon>library_add</mat-icon>
            {{ 'library.quickAdd' | t }}
          </button>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .media-card {
      cursor: pointer;
      width: 180px;
      transition: transform 0.2s;
      &:hover { transform: translateY(-4px); }
    }
    .poster-wrapper { position: relative; }
    .poster { width: 100%; height: 265px; object-fit: cover; display: block; }
    .poster-placeholder {
      width: 100%; height: 265px;
      display: flex; align-items: center; justify-content: center;
      background: var(--rf-surface-2);
      mat-icon { font-size: 64px; color: var(--rf-text-muted); }
    }
    .card-content { padding: 8px 12px 12px !important; }
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
      margin-top: 8px;
      height: 30px;
      font-size: 0.75rem;
    }
    .add-lib-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class MediaCardComponent {
  @Input({ required: true }) media!: Media;

  readonly auth = inject(AuthService);
  private readonly librarySvc = inject(LibraryService);
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(I18nService);

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
      next: () => this.snack.open(this.i18n.t('library.added'), this.i18n.t('auth.close'), { duration: 2000 }),
      error: (err) => {
        const message = this.i18n.translateApiError(err, 'library.addError');
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
