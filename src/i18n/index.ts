import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { en } from './en';
import type { Dict, TKey } from './en';
import { ar } from './ar';
import type { Lang } from '../types';

const dicts: Record<Lang, Record<string, string>> = { en, ar };

let activeLang: Lang = 'en';
const listeners = new Set<() => void>();

export const getLang = () => activeLang;

export function setActiveLang(lang: Lang) {
  if (lang === activeLang) return;
  activeLang = lang;
  listeners.forEach((l) => l());
}

export const dirFor = (lang: Lang): 'ltr' | 'rtl' => (lang === 'ar' ? 'rtl' : 'ltr');

export type TVars = Record<string, string | number>;

function interpolate(template: string, vars?: TVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m
  );
}

export function makeT(lang: Lang) {
  const dict = dicts[lang] ?? en;
  return (key: TKey | string, vars?: TVars): string => {
    const raw = dict[key] ?? (en as Dict)[key as TKey] ?? key;
    return interpolate(raw as string, vars);
  };
}

/** Translate outside React (toasts, exported helpers). */
export function t(key: TKey | string, vars?: TVars): string {
  return makeT(activeLang)(key, vars);
}

export function tIn(lang: Lang, key: TKey | string, vars?: TVars): string {
  return makeT(lang)(key, vars);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => activeLang, () => activeLang);
}

export function useT() {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

export function useDir(): 'ltr' | 'rtl' {
  return dirFor(useLang());
}

/** Keep <html lang dir> in sync. */
export function useDocumentLang() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);
  return lang;
}

export type { TKey, Dict };
