import { Injectable, computed, signal } from '@angular/core';
import { SupportedLanguage, TRANSLATIONS } from '../i18n/translations';

const STORAGE_KEY = 'ratecomic_lang';
const FALLBACK_LANGUAGE: SupportedLanguage = 'es';
const AVAILABLE_LANGUAGES: SupportedLanguage[] = ['es', 'en'];

const API_ERROR_KEY_MAP: Record<string, string> = {
  'El email ya esta en uso': 'apiErrors.emailInUse',
  'El email ya está en uso': 'apiErrors.emailInUse',
  'El nombre de usuario ya esta en uso': 'apiErrors.usernameInUse',
  'El nombre de usuario ya está en uso': 'apiErrors.usernameInUse',
  'Credenciales incorrectas': 'apiErrors.invalidCredentials',
  'Usuario no encontrado': 'apiErrors.userNotFound',
  'El parametro "q" debe tener al menos 2 caracteres': 'apiErrors.queryTooShort',
  'El parámetro "q" debe tener al menos 2 caracteres': 'apiErrors.queryTooShort',
  'Comentario no encontrado': 'apiErrors.commentNotFound',
  'No tienes permiso para editar este comentario': 'apiErrors.noPermissionEditComment',
  'No tienes permiso para eliminar este comentario': 'apiErrors.noPermissionDeleteComment',
  'Media no encontrada': 'apiErrors.mediaNotFound',
  'Token no proporcionado': 'apiErrors.tokenMissing',
  'Token invalido o expirado': 'apiErrors.tokenInvalidOrExpired',
  'Token inválido o expirado': 'apiErrors.tokenInvalidOrExpired',
  'Email no valido': 'apiErrors.invalidEmail',
  'Email no válido': 'apiErrors.invalidEmail',
  'Contrasena requerida': 'apiErrors.passwordRequired',
  'Contraseña requerida': 'apiErrors.passwordRequired',
  'El nombre de usuario debe tener entre 3 y 50 caracteres': 'apiErrors.usernameLength',
  'El nombre de usuario solo puede contener letras, numeros y guiones bajos': 'apiErrors.usernamePattern',
  'El nombre de usuario solo puede contener letras, números y guiones bajos': 'apiErrors.usernamePattern',
  'La contrasena debe tener al menos 8 caracteres': 'apiErrors.passwordMin',
  'La contraseña debe tener al menos 8 caracteres': 'apiErrors.passwordMin',
  'imdb_id requerido': 'apiErrors.imdbRequired',
  'La puntuacion debe ser un entero entre 1 y 10': 'apiErrors.scoreRange',
  'La puntuación debe ser un entero entre 1 y 10': 'apiErrors.scoreRange',
  'El comentario debe tener entre 1 y 2000 caracteres': 'apiErrors.commentLength',
  'parent_id debe ser un entero positivo': 'apiErrors.parentIdInvalid',
  'El contenido es requerido': 'apiErrors.contentRequired',
  'avatar_url debe ser una URL valida': 'apiErrors.avatarUrlInvalid',
  'avatar_url debe ser una URL válida': 'apiErrors.avatarUrlInvalid',
  'La bio no puede superar 500 caracteres': 'apiErrors.bioTooLong',
  'Demasiados intentos de autenticacion. Espera 15 minutos.': 'apiErrors.tooManyAuthAttempts',
  'Demasiados intentos de autenticación. Espera 15 minutos.': 'apiErrors.tooManyAuthAttempts',
  'Demasiadas peticiones, intenta de nuevo mas tarde.': 'apiErrors.tooManyRequests',
  'Demasiadas peticiones, intenta de nuevo más tarde.': 'apiErrors.tooManyRequests',
  'Endpoint no encontrado': 'apiErrors.endpointNotFound',
  'Error interno del servidor': 'apiErrors.internalServerError',
  'Identificador de comic no valido': 'apiErrors.invalidComicIdentifier',
  'Identificador de cómic no válido': 'apiErrors.invalidComicIdentifier',
  'Debes indicar un codigo o codigo de barras': 'apiErrors.libraryMissingCode',
  'Debes indicar un código o código de barras': 'apiErrors.libraryMissingCode',
  'Solo puedes anadir comics a tu biblioteca': 'apiErrors.libraryOnlyComics',
  'Solo puedes añadir comics a tu biblioteca': 'apiErrors.libraryOnlyComics',
  'Comic no encontrado en tu biblioteca': 'apiErrors.libraryNotFound',
  'Comic no encontrado en Comic Vine': 'apiErrors.comicNotFoundComicVine',
  'Comic no encontrado en Marvel': 'apiErrors.comicNotFoundMarvel',
  'Comic no encontrado en Open Library': 'apiErrors.comicNotFoundOpenLibrary',
  'Comic Vine no configurado. Define COMICVINE_API_KEY.': 'apiErrors.comicVineNotConfigured',
  'Marvel no configurado. Define MARVEL_PUBLIC_KEY y MARVEL_PRIVATE_KEY.': 'apiErrors.marvelNotConfigured',
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly currentLangSignal = signal<SupportedLanguage>(this.detectInitialLanguage());

  readonly language = computed(() => this.currentLangSignal());
  readonly availableLanguages = AVAILABLE_LANGUAGES;

  setLanguage(lang: SupportedLanguage) {
    if (!AVAILABLE_LANGUAGES.includes(lang)) return;
    this.currentLangSignal.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  t(key: string, params?: Record<string, unknown>): string {
    const lang = this.currentLangSignal();
    const dictionary = TRANSLATIONS[lang];
    const fallbackDictionary = TRANSLATIONS[FALLBACK_LANGUAGE];

    const value = this.resolvePath(dictionary, key) ?? this.resolvePath(fallbackDictionary, key) ?? key;
    const text = typeof value === 'string' ? value : key;

    if (!params) return text;
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
      const param = params[name];
      return param === undefined || param === null ? '' : String(param);
    });
  }

  translateApiError(error: unknown, fallbackKey: string): string {
    const rawMessage = this.extractApiErrorMessage(error);
    const mappedKey = rawMessage ? API_ERROR_KEY_MAP[rawMessage] : undefined;

    if (mappedKey) {
      return this.t(mappedKey);
    }

    if (rawMessage && this.currentLangSignal() === 'es') {
      return rawMessage;
    }

    return this.t(fallbackKey);
  }

  private detectInitialLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') {
      return stored;
    }

    const browser = (navigator.language || '').toLowerCase();
    if (browser.startsWith('en')) return 'en';
    return FALLBACK_LANGUAGE;
  }

  private extractApiErrorMessage(error: unknown): string | null {
    if (!error) return null;

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object') {
      const anyError = error as Record<string, unknown>;
      const nested = anyError['error'] as Record<string, unknown> | undefined;

      const direct = nested?.['error'];
      if (typeof direct === 'string' && direct.trim()) {
        return direct;
      }

      const nestedErrors = nested?.['errors'];
      if (Array.isArray(nestedErrors) && nestedErrors.length > 0) {
        const first = nestedErrors[0] as Record<string, unknown>;
        const msg = first['msg'];
        if (typeof msg === 'string' && msg.trim()) {
          return msg;
        }
      }

      const topErrors = anyError['errors'];
      if (Array.isArray(topErrors) && topErrors.length > 0) {
        const first = topErrors[0] as Record<string, unknown>;
        const msg = first['msg'];
        if (typeof msg === 'string' && msg.trim()) {
          return msg;
        }
      }

      const message = anyError['message'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return null;
  }

  private resolvePath(source: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);
  }
}
