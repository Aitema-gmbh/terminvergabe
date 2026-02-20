import { writable, derived } from 'svelte/store';
import de from './de.json';
import en from './en.json';

const translations = { de, en };

export type Locale = 'de' | 'en';

const getInitialLocale = (): Locale => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('aitema_locale') as Locale;
    if (saved && saved in translations) return saved;
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.split('-')[0] as Locale;
    if (lang in translations) return lang;
  }
  return 'de';
};

export const locale = writable<Locale>(getInitialLocale());

export const t = derived(locale, ($locale) => {
  const msgs = translations[$locale];
  return (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = msgs;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    let result = typeof value === 'string' ? value : key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return result;
  };
});

export const setLocale = (lang: Locale) => {
  locale.set(lang);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('aitema_locale', lang);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
};
