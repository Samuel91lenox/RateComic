import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';
import { TPipe } from '../../shared/pipes/t.pipe';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule, DatePipe, RouterLink,
    MatCardModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatButtonModule, TPipe,
  ],
  template: `
    <div class="rf-page rf-container">
      @if (loading()) {
        <div class="loading-center">
          <mat-progress-spinner mode="indeterminate" diameter="56"></mat-progress-spinner>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>person_off</mat-icon>
          <p>{{ error() }}</p>
          <a mat-stroked-button routerLink="/home">{{ 'nav.home' | t }}</a>
        </div>
      } @else if (user()) {
        <mat-card class="profile-card">
          <div class="avatar-section">
            @if (user()!.avatar_url) {
              <img [src]="resolveAvatar(user()!.avatar_url!)" [alt]="user()!.username" class="avatar">
            } @else {
              <mat-icon class="avatar-placeholder">account_circle</mat-icon>
            }
            <h1 class="username">{{ user()!.username }}</h1>
            <p class="text-muted member-since">
              {{ 'profile.memberSince' | t:{ date: (user()!.created_at | date:'MMMM yyyy') } }}
            </p>
          </div>

          @if (user()!.bio) {
            <mat-divider></mat-divider>
            <div class="bio-section">
              <p class="bio">{{ user()!.bio }}</p>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .loading-center { display: flex; justify-content: center; padding: 80px; }

    .error-state {
      text-align: center; padding: 80px 16px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: var(--rf-text-muted); display: block; margin: 0 auto 16px; }
      p { color: var(--rf-text-muted); margin-bottom: 24px; }
    }

    .profile-card {
      max-width: 480px;
      margin: 40px auto;
      padding: 32px;
      text-align: center;
    }

    .avatar-section { margin-bottom: 16px; }

    .avatar {
      width: 100px; height: 100px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--rf-primary);
      margin-bottom: 16px;
    }

    .avatar-placeholder {
      font-size: 100px; width: 100px; height: 100px;
      color: var(--rf-text-muted);
      margin-bottom: 16px;
    }

    .username { font-size: 1.6rem; font-weight: 700; margin: 0 0 8px; }
    .member-since { margin: 0; }

    .bio-section { padding: 20px 0 4px; }
    .bio { font-size: 1rem; line-height: 1.6; color: var(--rf-text-secondary); margin: 0; white-space: pre-wrap; }
  `],
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http   = inject(HttpClient);

  user    = signal<User | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  resolveAvatar(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace('/api', '')}${url}`;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<User>(`${environment.apiUrl}/users/${id}`).subscribe({
      next: (u) => { this.user.set(u); this.loading.set(false); },
      error: () => { this.error.set('Usuario no encontrado'); this.loading.set(false); },
    });
  }
}
