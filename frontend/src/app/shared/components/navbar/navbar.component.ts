import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
import { RATECOMIC_LOGO_CANDIDATES, getNextFallbackImage } from '../../../core/services/logo-fallback.util';
import { I18nService } from '../../../core/services/i18n.service';
import { TPipe } from '../../pipes/t.pipe';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, TPipe,
  ],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <a routerLink="/home" class="brand">
        <img [src]="logoSrc" (error)="onLogoError($event)" alt="RateComic" class="brand-logo">
        <span>RateComic</span>
      </a>

      <span class="rf-spacer"></span>

      <button mat-button [matMenuTriggerFor]="langMenu">
        <mat-icon>language</mat-icon>
        {{ i18n.language() === 'es' ? ('nav.spanish' | t) : ('nav.english' | t) }}
      </button>
      <mat-menu #langMenu="matMenu">
        <button mat-menu-item (click)="setLanguage('es')">{{ 'nav.spanish' | t }}</button>
        <button mat-menu-item (click)="setLanguage('en')">{{ 'nav.english' | t }}</button>
      </mat-menu>

      <nav class="nav-links">
        <a mat-button routerLink="/home" routerLinkActive="active">{{ 'nav.home' | t }}</a>
        @if (auth.isLoggedIn()) {
          <a mat-button routerLink="/library" routerLinkActive="active">{{ 'nav.library' | t }}</a>
        }
        <a mat-button routerLink="/media" routerLinkActive="active">{{ 'nav.explore' | t }}</a>
      </nav>

      @if (auth.isLoggedIn()) {
        <button mat-icon-button [matMenuTriggerFor]="userMenu" [attr.aria-label]="'nav.userMenu' | t">
          @if (auth.currentUser()?.avatar_url) {
            <img
              [src]="resolveAvatar(auth.currentUser()!.avatar_url!)"
              [alt]="auth.currentUser()!.username"
              class="user-avatar"
            >
          } @else {
            <mat-icon>account_circle</mat-icon>
          }
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item routerLink="/profile">
            <mat-icon>person</mat-icon>
            <span>{{ 'nav.profile' | t }}</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ 'nav.logout' | t }}</span>
          </button>
        </mat-menu>
      } @else {
        <button mat-button type="button" (click)="goToLogin()">{{ 'nav.login' | t }}</button>
        <button mat-raised-button color="accent" type="button" (click)="goToRegister()">{{ 'nav.register' | t }}</button>
      }
    </mat-toolbar>
  `,
  styles: [`
    .navbar { position: sticky; top: 0; z-index: 1000; }
    .brand {
      display: flex; align-items: center; gap: 8px;
      color: inherit; text-decoration: none; font-size: 1.2rem; font-weight: 500;
    }
    .brand-logo {
      width: 34px;
      height: 34px;
      object-fit: contain;
      border-radius: 8px;
      background: #ffffff;
      padding: 3px;
    }
    .nav-links { display: flex; gap: 4px; }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.45);
    }
    a.active { background: rgba(255,255,255,0.15); border-radius: 4px; }
  `],
})
export class NavbarComponent {
  private readonly logoCandidates: readonly string[] = RATECOMIC_LOGO_CANDIDATES;

  logoSrc: string = this.logoCandidates[0] ?? '';

  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

  setLanguage(lang: 'es' | 'en') {
    this.i18n.setLanguage(lang);
  }

  onLogoError(event: Event) {
    const img = event.target as HTMLImageElement;
    const nextImage = getNextFallbackImage(this.logoSrc, this.logoCandidates);

    if (nextImage) {
      this.logoSrc = nextImage;
      img.src = nextImage;
      return;
    }

    img.style.display = 'none';
  }

  resolveAvatar(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace('/api', '')}${url}`;
  }
}
