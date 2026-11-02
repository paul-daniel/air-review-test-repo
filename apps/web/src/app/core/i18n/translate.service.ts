import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Locale = 'en' | 'fr' | 'de';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'fr', 'de'];

type TranslationTree = { readonly [key: string]: string | TranslationTree };

const STORAGE_KEY = 'atlas.locale';

/**
 * Tiny JSON-backed translation service. Keys are dotted paths that mirror the
 * nesting of `assets/i18n/<locale>.json` (`feature.section.key`).
 */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly http = inject(HttpClient);
  private readonly dictionaries = new Map<Locale, Record<string, string>>();
  private readonly current = signal<Locale>(detectLocale());

  readonly locale = computed(() => this.current());

  async init(): Promise<void> {
    await this.load(this.current());
  }

  async use(locale: Locale): Promise<void> {
    await this.load(locale);
    this.current.set(locale);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore storage failures
    }
  }

  instant(key: string, params: Record<string, string | number> = {}): string {
    const dictionary = this.dictionaries.get(this.current());
    const template = dictionary?.[key];
    if (template === undefined) {
      if (typeof ngDevMode !== 'undefined' && ngDevMode) {
        console.warn(`[i18n] missing key "${key}" for locale ${this.current()}`);
      }
      return key;
    }
    return interpolate(template, params);
  }

  has(key: string): boolean {
    return this.dictionaries.get(this.current())?.[key] !== undefined;
  }

  private async load(locale: Locale): Promise<void> {
    if (this.dictionaries.has(locale)) return;
    const tree = await firstValueFrom(this.http.get<TranslationTree>(`/assets/i18n/${locale}.json`));
    this.dictionaries.set(locale, flatten(tree));
  }
}

export function flatten(tree: TranslationTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else {
      Object.assign(out, flatten(value, path));
    }
  }
  return out;
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) =>
    params[name] === undefined ? `{{${name}}}` : String(params[name]),
  );
}

function detectLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // ignore
  }
  const browser = globalThis.navigator?.language?.slice(0, 2);
  return browser && (SUPPORTED_LOCALES as readonly string[]).includes(browser) ? (browser as Locale) : 'en';
}

declare const ngDevMode: boolean | undefined;
