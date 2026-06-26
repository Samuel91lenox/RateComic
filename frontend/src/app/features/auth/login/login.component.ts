import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RATECOMIC_LOGO_CANDIDATES, getNextFallbackImage } from '../../../core/services/logo-fallback.util';
import { I18nService } from '../../../core/services/i18n.service';
import { TPipe } from '../../../shared/pipes/t.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, TPipe,
  ],
  template: `
    <div class="auth-page">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>
            <img [src]="logoSrc" (error)="onLogoError($event)" alt="RateComic" class="auth-logo">
            {{ 'auth.loginTitle' | t }}
          </mat-card-title>
          <mat-card-subtitle>{{ 'auth.loginSubtitle' | t }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.email' | t }}</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="email">
              @if (form.get('email')?.hasError('required')) {
                <mat-error>{{ 'auth.emailRequired' | t }}</mat-error>
              }
              @if (form.get('email')?.hasError('email')) {
                <mat-error>{{ 'auth.emailInvalid' | t }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.password' | t }}</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="hidePass ? 'password' : 'text'"
                formControlName="password" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button"
                (click)="hidePass = !hidePass" [attr.aria-label]="'auth.showPassword' | t">
                <mat-icon>{{ hidePass ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required')) {
                <mat-error>{{ 'auth.passwordRequired' | t }}</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
              class="full-width submit-btn"
              [disabled]="form.invalid || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'auth.submitLogin' | t }}
              }
            </button>
          </form>

          <div class="test-credentials text-muted">
            <small>{{ 'auth.testUserLabel' | t }}: <strong>user.test.ratecomic&#64;gmail.com</strong></small>
            <small>{{ 'auth.testPasswordLabel' | t }}: <strong>Test1234!</strong></small>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <p class="register-link">
            {{ 'auth.noAccount' | t }} <a routerLink="/auth/register">{{ 'auth.signUp' | t }}</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 64px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      background: radial-gradient(ellipse at top, #1a1a2e 0%, var(--rf-bg) 60%);
    }
    .auth-card { width: 100%; max-width: 420px; padding: 24px; }
    mat-card-header { display: flex; flex-direction: column; align-items: center; }
    mat-card-title {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 1.4rem;
      text-align: center;
    }
    mat-card-subtitle { text-align: center; }
    .auth-logo {
      width: 30px;
      height: 30px;
      object-fit: contain;
      border-radius: 6px;
    }
    .auth-form { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .test-credentials {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 14px;
      font-size: 0.75rem;
      line-height: 1.2;
      text-align: center;
    }
    .test-credentials strong { font-weight: 600; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 1rem; margin-top: 8px; }
    .register-link { text-align: center; margin: 0; }
    mat-spinner { margin: auto; }
  `],
})
export class LoginComponent {
  private readonly logoCandidates: readonly string[] = RATECOMIC_LOGO_CANDIDATES;

  logoSrc: string = this.logoCandidates[0] ?? '';

  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private snack  = inject(MatSnackBar);
  private i18n   = inject(I18nService);

  hidePass = true;
  loading  = false;

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.loading = false;
        this.snack.open(this.i18n.translateApiError(err, 'auth.loginError'), this.i18n.t('auth.close'), { duration: 4000 });
      },
    });
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
}
