import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MediaService } from '../../core/services/media.service';
import { MediaCardComponent } from '../../shared/components/media-card/media-card.component';
import { Media } from '../../core/models/media.model';
import { AuthService } from '../../core/services/auth.service';
import { TPipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MediaCardComponent, TPipe,
  ],
  template: `
    <div class="home-page">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-content rf-container">
          <h1 class="hero-title">
            <img src="assets/images/logo_ratecomic.png" alt="RateComic" class="hero-logo">
          </h1>
          <p class="hero-subtitle">{{ 'home.heroSubtitle' | t }}</p>
          @if (!auth.isLoggedIn()) {
            <div class="hero-actions">
              <a mat-raised-button color="accent" routerLink="/auth/register">
                <mat-icon>how_to_reg</mat-icon>
                {{ 'home.joinFree' | t }}
              </a>
              <a mat-stroked-button routerLink="/media">
                <mat-icon>explore</mat-icon>
                {{ 'home.explore' | t }}
              </a>
            </div>
          } @else {
            <a mat-raised-button color="accent" routerLink="/media">
              <mat-icon>search</mat-icon>
              {{ 'home.searchComics' | t }}
            </a>
          }
        </div>
      </section>

      <!-- Trending -->
      <section class="rf-container trending-section">
        <h2 class="section-title">
          <mat-icon>trending_up</mat-icon>
          {{ 'home.topRated' | t }}
        </h2>

        @if (loading()) {
          <div class="loading-center">
            <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
          </div>
        } @else if (trending().length === 0) {
          <div class="empty-state">
            <mat-icon>movie_filter</mat-icon>
            <p>{{ 'home.noRatings' | t }}</p>
            <a mat-raised-button color="primary" routerLink="/media">{{ 'home.exploreContent' | t }}</a>
          </div>
        } @else {
          <div class="media-grid">
            @for (item of trending(); track item.imdb_id) {
              <app-media-card [media]="item" />
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .home-page { padding-bottom: 48px; }

    .hero {
      background: linear-gradient(135deg, #0d0d1a 0%, #1a1a3e 50%, #0d0d1a 100%);
      padding: 80px 16px;
      text-align: center;
      border-bottom: 1px solid var(--rf-border);
    }
    .hero-title {
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 700; margin: 0 0 16px; letter-spacing: -2px;
    }
    .hero-logo {
      height: clamp(160px, 25vw, 300px);
      width: auto;
      display: block;
      margin: 0 auto;
    }
    .accent { color: var(--rf-accent); }
    .hero-subtitle {
      font-size: 1.1rem; color: var(--rf-text-muted);
      margin: 0 0 32px; line-height: 1.6;
      white-space: pre-line;
    }
    .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

    .trending-section { margin-top: 48px; }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.4rem; margin-bottom: 16px;
    }

    .media-grid {
      display: flex; flex-wrap: wrap; gap: 16px;
      margin-top: 24px;
    }

    .loading-center {
      display: flex; justify-content: center; padding: 48px;
    }

    .empty-state {
      text-align: center; padding: 64px 16px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--rf-text-muted); }
      p { color: var(--rf-text-muted); margin: 16px 0; }
    }
  `],
})
export class HomeComponent implements OnInit {
  readonly auth     = inject(AuthService);
  private mediaSvc  = inject(MediaService);

  trending = signal<Media[]>([]);
  loading  = signal(false);

  ngOnInit() {
    this.loadTrending();
  }

  private loadTrending() {
    this.loading.set(true);
    this.mediaSvc.getTrending().subscribe({
      next: (data) => { this.trending.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
