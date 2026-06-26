import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MediaService } from '../../../core/services/media.service';
import { RatingService } from '../../../core/services/rating.service';
import { CommentService } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Media } from '../../../core/models/media.model';
import { Comment } from '../../../core/models/comment.model';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { CommentCardComponent } from '../../../shared/components/comment-card/comment-card.component';
import { I18nService } from '../../../core/services/i18n.service';
import { LibraryService } from '../../../core/services/library.service';
import { TPipe } from '../../../shared/pipes/t.pipe';

@Component({
  selector: 'app-media-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatSnackBarModule,
    StarRatingComponent, CommentCardComponent, TPipe,
  ],
  template: `
    @if (loading()) {
      <div class="loading-center">
        <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
      </div>
    } @else if (media()) {
      <div class="detail-page">
        <!-- Cabecera con backdrop -->
        <div class="backdrop" [style.background-image]="media()!.poster_url ? 'url(' + media()!.poster_url + ')' : 'none'">
          <div class="backdrop-overlay"></div>
          <div class="rf-container header-content">
            @if (media()!.poster_url) {
              <img [src]="media()!.poster_url" [alt]="media()!.title" class="poster">
            }
            <div class="header-info">
              <div class="type-chips">
                @if (isCurrentCharacter()) {
                  <mat-chip color="accent" selected>{{ 'mediaDetail.character' | t }}</mat-chip>
                }
                @if (media()!.rated) {
                  <mat-chip>{{ media()!.rated }}</mat-chip>
                }
              </div>
              <h1 class="media-title">{{ media()!.title }}</h1>
              <div class="meta">
                @if (media()!.year) { <span>{{ media()!.year }}</span> }
                @if (media()!.runtime) { <span>·</span><span>{{ media()!.runtime }}</span> }
                @if (media()!.total_seasons) { <span>·</span><span>{{ media()!.total_seasons }} {{ 'mediaDetail.volumes' | t }}</span> }
              </div>
              @if (media()!.genre) {
                <p class="genre text-muted">{{ media()!.genre }}</p>
              }

              <!-- Puntuación IMDB -->
              @if (media()!.imdb_rating) {
                <div class="imdb-rating">
                  <span class="imdb-logo">IMDb</span>
                  <span class="imdb-score">{{ media()!.imdb_rating }}</span>
                  <span class="text-muted">/10</span>
                </div>
              }

              <!-- Puntuación comunidad -->
              @if (media()!.rating_stats?.total_votes) {
                <div class="community-rating">
                  <mat-icon class="star-icon">star</mat-icon>
                  <span class="score">{{ media()!.rating_stats!.avg_score }}</span>
                  <span class="text-muted">{{ 'mediaDetail.communityVotes' | t:{ votes: media()!.rating_stats!.total_votes } }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Cuerpo -->
        <div class="rf-container detail-body">

          <!-- Sinopsis -->
          @if (media()!.plot) {
            <section class="section">
              <h2>{{ 'mediaDetail.synopsis' | t }}</h2>
              <p class="plot">{{ media()!.plot }}</p>
            </section>
            <mat-divider></mat-divider>
          }

          <!-- Detalles técnicos -->
          <section class="section details-grid">
            @if (media()!.director) {
              <div class="detail-item">
                <span class="detail-label">{{ 'mediaDetail.director' | t }}</span>
                <span>{{ media()!.director }}</span>
              </div>
            }
            @if (media()!.actors) {
              <div class="detail-item">
                <span class="detail-label">{{ 'mediaDetail.cast' | t }}</span>
                <span>{{ media()!.actors }}</span>
              </div>
            }
            @if (media()!.country) {
              <div class="detail-item">
                <span class="detail-label">{{ 'mediaDetail.country' | t }}</span>
                <span>{{ media()!.country }}</span>
              </div>
            }
            @if (media()!.language) {
              <div class="detail-item">
                <span class="detail-label">{{ 'mediaDetail.language' | t }}</span>
                <span>{{ media()!.language }}</span>
              </div>
            }
          </section>

          <mat-divider></mat-divider>

          <!-- Tu valoración -->
          <section class="section">
            <h2>{{ 'mediaDetail.yourRating' | t }}</h2>
            @if (auth.isLoggedIn()) {
              <div class="rating-section">
                <app-star-rating
                  [value]="myRating()"
                  [showValue]="true"
                  (rated)="onRate($event)"
                />
                @if (myRating() > 0) {
                  <button mat-button color="warn" (click)="deleteRating()">
                    <mat-icon>delete</mat-icon>
                    {{ 'mediaDetail.deleteRating' | t }}
                  </button>
                }
                @if (auth.isLoggedIn() && canAddCurrentToLibrary()) {
                  <button mat-stroked-button color="primary" (click)="addCurrentToLibrary()">
                    <mat-icon>library_add</mat-icon>
                    {{ 'library.quickAdd' | t }}
                  </button>
                }
              </div>
            } @else {
              <p class="text-muted">
                <a routerLink="/auth/login">{{ 'nav.login' | t }}</a> {{ 'mediaDetail.loginToRate' | t }}
              </p>
            }
          </section>

          <mat-divider></mat-divider>

          <!-- Comentarios -->
          <section class="section">
            <h2>{{ 'mediaDetail.comments' | t:{ count: comments().length } }}</h2>

            @if (auth.isLoggedIn()) {
              <div class="new-comment">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'mediaDetail.writeComment' | t }}</mat-label>
                  <textarea matInput [formControl]="commentCtrl" rows="3" maxlength="2000"></textarea>
                  <mat-hint align="end">{{ commentCtrl.value?.length || 0 }}/2000</mat-hint>
                </mat-form-field>
                <button mat-raised-button color="primary"
                  [disabled]="commentCtrl.invalid || savingComment()"
                  (click)="submitComment()">
                  <mat-icon>send</mat-icon>
                  {{ 'mediaDetail.publish' | t }}
                </button>
              </div>
            }

            @if (commentsLoading()) {
              <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
            } @else if (comments().length === 0) {
              <p class="text-muted">{{ 'mediaDetail.firstComment' | t }}</p>
            } @else {
              <div class="comments-list">
                @for (comment of comments(); track comment.id) {
                  <app-comment-card
                    [comment]="comment"
                    (deleted)="onCommentDeleted($event)"
                    (replied)="onReply($event)"
                  />
                }
              </div>
            }
          </section>
        </div>
      </div>
    } @else {
      <div class="error-state rf-container">
        <mat-icon>error_outline</mat-icon>
        <p>{{ 'mediaDetail.loadError' | t }}</p>
        <a mat-button routerLink="/media">{{ 'mediaDetail.backToExplore' | t }}</a>
      </div>
    }
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    .backdrop {
      position: relative;
      background-size: cover;
      background-position: center;
      background-color: var(--rf-surface);
      padding: 40px 0;
    }
    .backdrop-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to right, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.5) 100%);
    }
    .header-content {
      position: relative; z-index: 1;
      display: flex; gap: 32px; align-items: flex-start;
    }
    .poster {
      width: 200px; min-width: 200px; border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .header-info { flex: 1; }
    .type-chips { display: flex; gap: 8px; margin-bottom: 12px; }
    .media-title { font-size: clamp(1.5rem, 4vw, 2.5rem); margin: 0 0 8px; }
    .meta { display: flex; gap: 8px; color: var(--rf-text-muted); margin-bottom: 8px; }
    .genre { margin: 4px 0; }
    .imdb-rating { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .imdb-logo {
      background: #f5c518; color: #000;
      padding: 2px 6px; border-radius: 4px;
      font-weight: 700; font-size: 0.85rem;
    }
    .imdb-score { font-size: 1.4rem; font-weight: 700; }
    .community-rating {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
    }
    .star-icon { color: var(--rf-star-filled); }
    .score { font-size: 1.3rem; font-weight: 700; color: var(--rf-accent); }

    .detail-body { padding-top: 32px; padding-bottom: 64px; }
    .section { padding: 24px 0; }
    .section h2 { margin-top: 0; margin-bottom: 16px; }
    .plot { line-height: 1.7; font-size: 1rem; }
    .details-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .detail-item { display: flex; flex-direction: column; }
    .detail-label { font-weight: 500; color: var(--rf-accent); font-size: 0.8rem; text-transform: uppercase; margin-bottom: 2px; }

    .rating-section { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

    .new-comment { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .full-width { width: 100%; }
    .comments-list { display: flex; flex-direction: column; }

    .error-state {
      text-align: center; padding: 80px 16px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--rf-text-muted); }
    }

    @media (max-width: 640px) {
      .header-content { flex-direction: column; }
      .poster { width: 140px; min-width: 140px; }
    }
  `],
})
export class MediaDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private mediaSvc   = inject(MediaService);
  private ratingSvc  = inject(RatingService);
  private commentSvc = inject(CommentService);
  private librarySvc = inject(LibraryService);
  readonly auth      = inject(AuthService);
  private snack      = inject(MatSnackBar);
  private i18n       = inject(I18nService);

  media           = signal<Media | null>(null);
  loading         = signal(true);
  comments        = signal<Comment[]>([]);
  commentsLoading = signal(false);
  savingComment   = signal(false);
  myRating        = signal(0);

  commentCtrl = new FormControl('', [Validators.required, Validators.minLength(1)]);

  ngOnInit() {
    const imdbId = this.route.snapshot.paramMap.get('imdbId')!;
    this.loadMedia(imdbId);
    this.loadComments(imdbId);

    if (this.auth.isLoggedIn()) {
      this.ratingSvc.getStats(imdbId).subscribe({
        next: () => {},
        error: () => {},
      });
      // Cargar mi valoración personal
      this.ratingSvc.getMyRatings().subscribe({
        next: (ratings) => {
          const mine = ratings.find(r => r.imdb_id === imdbId);
          if (mine) this.myRating.set(mine.score);
        },
        error: () => {},
      });
    }
  }

  private loadMedia(imdbId: string) {
    this.loading.set(true);
    this.mediaSvc.getDetail(imdbId).subscribe({
      next: (data) => { this.media.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private loadComments(imdbId: string) {
    this.commentsLoading.set(true);
    this.commentSvc.getComments(imdbId).subscribe({
      next: (data) => { this.comments.set(data); this.commentsLoading.set(false); },
      error: () => this.commentsLoading.set(false),
    });
  }

  onRate(score: number) {
    const imdbId = this.route.snapshot.paramMap.get('imdbId')!;
    this.myRating.set(score);
    this.ratingSvc.rate(imdbId, score).subscribe({
      next: () => {
        this.snack.open(this.i18n.t('mediaDetail.ratingSaved'), '', { duration: 2000 });
        this.loadMedia(imdbId); // refrescar stats
      },
      error: (err) => this.snack.open(this.i18n.translateApiError(err, 'mediaDetail.ratingSaveError'), this.i18n.t('mediaDetail.close'), { duration: 3000 }),
    });
  }

  deleteRating() {
    const imdbId = this.route.snapshot.paramMap.get('imdbId')!;
    this.ratingSvc.deleteRating(imdbId).subscribe({
      next: () => {
        this.myRating.set(0);
        this.snack.open(this.i18n.t('mediaDetail.ratingDeleted'), '', { duration: 2000 });
        this.loadMedia(imdbId);
      },
    });
  }

  submitComment() {
    const imdbId = this.route.snapshot.paramMap.get('imdbId')!;
    if (this.commentCtrl.invalid) return;
    this.savingComment.set(true);

    this.commentSvc.createComment(imdbId, this.commentCtrl.value!).subscribe({
      next: (comment) => {
        this.comments.update(list => [{ ...comment, replies: [] }, ...list]);
        this.commentCtrl.reset();
        this.savingComment.set(false);
      },
      error: (err) => {
        this.snack.open(this.i18n.translateApiError(err, 'mediaDetail.commentPublishError'), this.i18n.t('mediaDetail.close'), { duration: 3000 });
        this.savingComment.set(false);
      },
    });
  }

  onCommentDeleted(id: number) {
    this.commentSvc.deleteComment(id).subscribe({
      next: () => this.comments.update(list => list.filter(c => c.id !== id)),
      error: (err) => this.snack.open(this.i18n.translateApiError(err, 'mediaDetail.commentDeleteError'), this.i18n.t('mediaDetail.close'), { duration: 3000 }),
    });
  }

  onReply(event: { parent_id: number; content: string }) {
    const imdbId = this.route.snapshot.paramMap.get('imdbId')!;
    this.commentSvc.createComment(imdbId, event.content, event.parent_id).subscribe({
      next: (reply) => {
        this.comments.update(list => list.map(c => {
          if (c.id === event.parent_id) {
            return { ...c, replies: [...(c.replies || []), reply] };
          }
          return c;
        }));
      },
      error: (err) => this.snack.open(this.i18n.translateApiError(err, 'mediaDetail.replyPublishError'), this.i18n.t('mediaDetail.close'), { duration: 3000 }),
    });
  }

  addCurrentToLibrary() {
    const item = this.media();
    if (!item) return;
    if (!this.canAddCurrentToLibrary()) return;

    this.librarySvc.importComic({ code: item.imdb_id }).subscribe({
      next: () => this.snack.open(this.i18n.t('library.added'), this.i18n.t('mediaDetail.close'), { duration: 2000 }),
      error: (err) => {
        const message = this.i18n.translateApiError(err, 'library.addError');
        this.snack.open(message, this.i18n.t('mediaDetail.close'), { duration: 2500 });
      },
    });
  }

  canAddCurrentToLibrary(): boolean {
    const item = this.media();
    if (!item) return false;

    const type = String(item.type || '').toLowerCase();
    if (type) {
      return type === 'comic';
    }

    const id = String(item.imdb_id || '').toLowerCase();
    return !id.includes('character');
  }

  isCurrentCharacter(): boolean {
    const item = this.media();
    if (!item) return false;

    const type = String(item.type || '').toLowerCase();
    if (type) {
      return type === 'character';
    }

    const id = String(item.imdb_id || '').toLowerCase();
    return id.includes('character');
  }
}
