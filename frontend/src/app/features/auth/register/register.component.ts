import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
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

function passwordsMatch(control: AbstractControl) {
  const pass    = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
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
            {{ 'auth.registerTitle' | t }}
          </mat-card-title>
          <mat-card-subtitle>{{ 'auth.registerSubtitle' | t }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.username' | t }}</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="username" autocomplete="username">
              @if (form.get('username')?.hasError('required')) {
                <mat-error>{{ 'auth.usernameRequired' | t }}</mat-error>
              }
              @if (form.get('username')?.hasError('minlength')) {
                <mat-error>{{ 'auth.usernameMin' | t }}</mat-error>
              }
              @if (form.get('username')?.hasError('pattern')) {
                <mat-error>{{ 'auth.usernamePattern' | t }}</mat-error>
              }
            </mat-form-field>

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
                formControlName="password" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="hidePass = !hidePass">
                <mat-icon>{{ hidePass ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('minlength')) {
                <mat-error>{{ 'auth.passwordMin' | t }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.confirmPassword' | t }}</mat-label>
              <mat-icon matPrefix>lock_outline</mat-icon>
              <input matInput [type]="hidePass ? 'password' : 'text'"
                formControlName="confirmPassword" autocomplete="new-password">
              @if (form.hasError('passwordsMismatch') && form.get('confirmPassword')?.dirty) {
                <mat-error>{{ 'auth.passwordMismatch' | t }}</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
              class="full-width submit-btn"
              [disabled]="form.invalid || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'auth.submitRegister' | t }}
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="login-link">
            {{ 'auth.haveAccount' | t }} <a routerLink="/auth/login">{{ 'auth.signIn' | t }}</a>
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
    .auth-card { width: 100%; max-width: 440px; padding: 24px; }
    mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 1.4rem; }
    .auth-logo {
      width: 30px;
      height: 30px;
      object-fit: contain;
      border-radius: 6px;
    }
    .auth-form { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 1rem; margin-top: 8px; }
    .login-link { text-align: center; margin: 0; }
    mat-spinner { margin: auto; }
  `],
})
export class RegisterComponent {
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
    username:        ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { username, email, password } = this.form.value;
    this.auth.register({ username: username!, email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.loading = false;
        this.snack.open(this.i18n.translateApiError(err, 'auth.registerError'), this.i18n.t('auth.close'), { duration: 4000 });
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
