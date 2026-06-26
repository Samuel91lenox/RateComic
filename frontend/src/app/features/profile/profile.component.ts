import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { RatingService } from '../../core/services/rating.service';
import { Rating } from '../../core/models/media.model';
import { User } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { I18nService } from '../../core/services/i18n.service';
import { TPipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, DatePipe, RouterLink, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatDividerModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTabsModule,
    StarRatingComponent, TPipe,
  ],
  template: `
    <div class="rf-page rf-container">
      <h1 class="page-title">
        <mat-icon>account_circle</mat-icon>
        {{ 'profile.title' | t }}
      </h1>

      @if (user()) {
        <div class="profile-layout">
          <!-- Tarjeta de perfil -->
          <mat-card class="profile-card">
            <div class="avatar-section">
              @if (user()!.avatar_url) {
                <img [src]="resolveAvatar(user()!.avatar_url!)" [alt]="user()!.username" class="avatar">
              } @else {
                <mat-icon class="avatar-placeholder">account_circle</mat-icon>
              }
              <h2>{{ user()!.username }}</h2>
              <p class="text-muted">{{ 'profile.memberSince' | t:{ date: (user()!.created_at | date:'MMMM yyyy') } }}</p>
            </div>

            @if (user()!.bio) {
              <p class="bio">{{ user()!.bio }}</p>
              <mat-divider></mat-divider>
            }

            <!-- Editar perfil -->
            <details class="edit-section">
              <summary>
                <mat-icon>edit</mat-icon>
                {{ 'profile.editProfile' | t }}
              </summary>

              <!-- Subir avatar -->
              <div class="avatar-upload">
                <label class="upload-label">
                  <input #avatarInput type="file" accept="image/*" (change)="onAvatarSelected($event)" hidden>
                  <button mat-stroked-button type="button" (click)="avatarInput.click()" [disabled]="uploadingAvatar()">
                    <mat-icon>upload</mat-icon>
                    {{ uploadingAvatar() ? ('profile.uploading' | t) : ('profile.uploadAvatar' | t) }}
                  </button>
                </label>
                <span class="upload-hint text-muted">{{ 'profile.avatarHint' | t }}</span>
              </div>

              <form [formGroup]="editForm" (ngSubmit)="saveProfile()" class="edit-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'profile.bio' | t }}</mat-label>
                  <textarea matInput formControlName="bio" rows="3" maxlength="500"></textarea>
                  <mat-hint align="end">{{ editForm.get('bio')?.value?.length || 0 }}/500</mat-hint>
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
                  {{ 'profile.save' | t }}
                </button>
              </form>
            </details>
          </mat-card>

          <!-- Mis valoraciones -->
          <div class="ratings-section">
            <h2>{{ 'profile.myRatings' | t:{ count: myRatings().length } }}</h2>

            @if (ratingsLoading()) {
              <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
            } @else if (myRatings().length === 0) {
              <div class="empty-state">
                <mat-icon>star_border</mat-icon>
                <p>{{ 'profile.noRatings' | t }}</p>
                <a mat-raised-button color="primary" routerLink="/media">{{ 'profile.exploreContent' | t }}</a>
              </div>
            } @else {
              <div class="ratings-grid">
                @for (r of myRatings(); track r.id) {
                  <a [routerLink]="['/media', r.imdb_id]" class="rating-item rf-card">
                    @if (r.poster_url) {
                      <img [src]="r.poster_url" [alt]="r.title" class="r-poster" loading="lazy">
                    } @else {
                      <div class="r-poster-ph"><mat-icon>movie</mat-icon></div>
                    }
                    <div class="r-info">
                      <span class="r-title">{{ r.title }}</span>
                      <app-star-rating [value]="r.score" [readonly]="true" [showValue]="true" />
                    </div>
                  </a>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-title { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }

    .profile-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 32px;
      align-items: start;
    }

    .profile-card { padding: 24px; }
    .avatar-section { text-align: center; margin-bottom: 16px; }
    .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
    .avatar-placeholder { font-size: 100px; width: 100px; height: 100px; color: var(--rf-text-muted); }
    .bio { line-height: 1.6; margin: 16px 0; }

    .edit-section {
      margin-top: 16px;
      summary {
        cursor: pointer; display: flex; align-items: center; gap: 4px;
        color: var(--rf-accent); user-select: none;
        mat-icon { font-size: 18px; }
      }
    }
    .edit-section summary { cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .edit-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .avatar-upload { display: flex; align-items: center; gap: 12px; margin: 16px 0 4px; flex-wrap: wrap; }
    .upload-hint { font-size: 0.75rem; }
    .upload-label { display: contents; }
    .full-width { width: 100%; }

    .ratings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .rating-item {
      display: flex; flex-direction: column;
      text-decoration: none; color: inherit;
      transition: transform 0.2s;
      &:hover { transform: translateY(-3px); }
    }
    .r-poster { width: 100%; height: 180px; object-fit: cover; display: block; }
    .r-poster-ph {
      width: 100%; height: 180px;
      display: flex; align-items: center; justify-content: center;
      background: var(--rf-surface-2);
      mat-icon { font-size: 48px; color: var(--rf-text-muted); }
    }
    .r-info { padding: 8px 12px 12px; }
    .r-title { font-size: 0.85rem; font-weight: 500; display: block; margin-bottom: 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .empty-state {
      text-align: center; padding: 48px 16px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--rf-text-muted); }
      p { color: var(--rf-text-muted); }
    }

    @media (max-width: 768px) {
      .profile-layout { grid-template-columns: 1fr; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  readonly auth    = inject(AuthService);
  private ratingSvc = inject(RatingService);
  private http     = inject(HttpClient);
  private snack    = inject(MatSnackBar);
  private fb       = inject(FormBuilder);
  private i18n     = inject(I18nService);

  user           = signal<User | null>(null);
  myRatings      = signal<Rating[]>([]);
  ratingsLoading = signal(false);
  saving         = signal(false);
  uploadingAvatar = signal(false);

  editForm = this.fb.group({
    bio: ['', [Validators.maxLength(500)]],
  });

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) {
      this.user.set(u);
      this.editForm.patchValue({ bio: u.bio || '' });
    }
    this.loadRatings();
  }

  private loadRatings() {
    this.ratingsLoading.set(true);
    this.ratingSvc.getMyRatings().subscribe({
      next: (data) => { this.myRatings.set(data); this.ratingsLoading.set(false); },
      error: () => this.ratingsLoading.set(false),
    });
  }

  saveProfile() {
    const { bio } = this.editForm.value;
    const payload = { bio: bio || null };
    this.saving.set(true);
    this.http.patch<User>(`${environment.apiUrl}/users/me`, payload).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.auth.currentUser.set(updated);
        this.saving.set(false);
        this.snack.open(this.i18n.t('profile.profileUpdated'), '', { duration: 2000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(this.i18n.translateApiError(err, 'profile.saveError'), this.i18n.t('profile.close'), { duration: 3000 });
      },
    });
  }

  resolveAvatar(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace('/api', '')}${url}`;
  }

  onAvatarSelected(event: Event) {    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    this.uploadingAvatar.set(true);
    this.http.post<User>(`${environment.apiUrl}/users/me/avatar`, formData).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.auth.currentUser.set(updated);
        this.uploadingAvatar.set(false);
        this.snack.open(this.i18n.t('profile.avatarUpdated'), '', { duration: 2000 });
        // Resetear el input para poder subir la misma imagen de nuevo
        (event.target as HTMLInputElement).value = '';
      },
      error: (err) => {
        this.uploadingAvatar.set(false);
        this.snack.open(this.i18n.translateApiError(err, 'profile.saveError'), this.i18n.t('profile.close'), { duration: 3000 });
      },
    });
  }
}
