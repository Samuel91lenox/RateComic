import { I18nService } from './i18n.service';

describe('I18nService', () => {
  const storageKey = 'ratecomic_lang';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
  });

  it('initializes language from persisted value', () => {
    localStorage.setItem(storageKey, 'en');
    const service = new I18nService();

    expect(service.language()).toBe('en');
    expect(service.t('nav.home')).toBe('Home');
  });

  it('switches language and persists selection', () => {
    const service = new I18nService();

    service.setLanguage('en');

    expect(service.language()).toBe('en');
    expect(localStorage.getItem(storageKey)).toBe('en');
    expect(service.t('auth.submitLogin')).toBe('Log in');
  });

  it('interpolates parameters in translation strings', () => {
    localStorage.setItem(storageKey, 'en');
    const service = new I18nService();

    const text = service.t('mediaList.resultsFor', { total: 12, query: 'batman' });

    expect(text).toBe('12 results for "batman"');
  });

  it('maps known backend API errors to selected language', () => {
    localStorage.setItem(storageKey, 'en');
    const service = new I18nService();

    const apiError = { error: { error: 'Credenciales incorrectas' } };

    expect(service.translateApiError(apiError, 'auth.loginError')).toBe('Invalid credentials');
  });

  it('extracts validation message arrays from backend errors', () => {
    localStorage.setItem(storageKey, 'en');
    const service = new I18nService();

    const apiError = { error: { errors: [{ msg: 'Email no válido' }] } };

    expect(service.translateApiError(apiError, 'auth.registerError')).toBe('Invalid email');
  });

  it('keeps unknown API message in spanish and falls back in english', () => {
    localStorage.setItem(storageKey, 'es');
    const serviceEs = new I18nService();

    const unknownError = { error: { error: 'Mensaje no mapeado' } };
    expect(serviceEs.translateApiError(unknownError, 'auth.loginError')).toBe('Mensaje no mapeado');

    serviceEs.setLanguage('en');
    expect(serviceEs.translateApiError(unknownError, 'auth.loginError')).toBe('Login failed');
  });
});
