import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NavbarComponent } from './navbar.component';
import { I18nService } from '../../../core/services/i18n.service';
import { AuthService } from '../../../core/services/auth.service';

const LANG_KEY = 'ratecomic_lang';

describe('NavbarComponent – language selector integration', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let i18n: I18nService;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.removeItem(LANG_KEY);

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem(LANG_KEY);
  });

  // ─── Language button label ────────────────────────────────────────────────

  it('renders navbar without errors', () => {
    const toolbar = fixture.nativeElement.querySelector('mat-toolbar');
    expect(toolbar).toBeTruthy();
  });

  it('shows Spanish label on language button when language is ES', () => {
    i18n.setLanguage('es');
    fixture.detectChanges();

    const langButton = fixture.nativeElement.querySelector('[mat-button]') as HTMLElement;
    expect(langButton.textContent).toContain('Espanol');
  });

  it('shows English label on language button when language is EN', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();

    const langButton = fixture.nativeElement.querySelector('[mat-button]') as HTMLElement;
    expect(langButton.textContent).toContain('English');
  });

  // ─── Nav links ────────────────────────────────────────────────────────────

  it('displays "Inicio" and "Explorar" links in Spanish', () => {
    i18n.setLanguage('es');
    fixture.detectChanges();

    const navText = fixture.nativeElement.querySelector('.nav-links').textContent as string;
    expect(navText).toContain('Inicio');
    expect(navText).toContain('Explorar');
  });

  it('displays "Home" and "Explore" links in English', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();

    const navText = fixture.nativeElement.querySelector('.nav-links').textContent as string;
    expect(navText).toContain('Home');
    expect(navText).toContain('Explore');
  });

  // ─── Auth links (not logged in) ───────────────────────────────────────────

  it('shows "Entrar" and "Registrarse" in Spanish when logged out', () => {
    i18n.setLanguage('es');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Entrar');
    expect(text).toContain('Registrarse');
  });

  it('shows "Log in" and "Sign up" in English when logged out', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Log in');
    expect(text).toContain('Sign up');
  });

  // ─── setLanguage() method exposed by component ───────────────────────────

  it('setLanguage() on component updates I18nService signal', () => {
    i18n.setLanguage('es');
    fixture.detectChanges();

    fixture.componentInstance.setLanguage('en');
    fixture.detectChanges();

    expect(i18n.language()).toBe('en');
    const langButton = fixture.nativeElement.querySelector('[mat-button]') as HTMLElement;
    expect(langButton.textContent).toContain('English');
  });

  it('setLanguage() persists selection in localStorage', () => {
    fixture.componentInstance.setLanguage('en');
    fixture.detectChanges();

    expect(localStorage.getItem(LANG_KEY)).toBe('en');
  });

  // ─── Round-trip ES → EN → ES ──────────────────────────────────────────────

  it('switching language back to ES restores Spanish text', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();

    i18n.setLanguage('es');
    fixture.detectChanges();

    const navText = fixture.nativeElement.querySelector('.nav-links').textContent as string;
    expect(navText).toContain('Inicio');
    expect(navText).not.toContain('Home');
  });

  it('shows "Biblioteca" link when user is logged in', () => {
    auth.currentUser.set({
      id: 1,
      username: 'samuel',
      email: 'samuel@example.com',
      role: 'user',
      created_at: new Date().toISOString(),
    });
    i18n.setLanguage('es');
    fixture.detectChanges();

    const navText = fixture.nativeElement.querySelector('.nav-links').textContent as string;
    expect(navText).toContain('Biblioteca');
  });
});
