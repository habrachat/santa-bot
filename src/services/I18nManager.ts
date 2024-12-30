import fs from 'fs';
import path from 'path';
import { GAME_CONFIG } from '../config.ts';

type Translation = { [key: string]: Translation | string };

export class I18nManager {
  defaultLocale: string;
  currentLocale: string;
  translations: Translation = {};

  constructor(defaultLocale = 'en') {
    this.defaultLocale = defaultLocale;
    this.currentLocale = defaultLocale;
    this.loadTranslations();
  }

  loadTranslations() {
    const localesPath = path.join('locales');
    try {
      const files = fs.readdirSync(localesPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const locale = file.replace('.json', '');
          const content = fs.readFileSync(path.join(localesPath, file), 'utf-8');
          this.translations[locale] = JSON.parse(content);
        }
      });
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  setLocale(locale: string) {
    if (this.translations[locale]) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  }

  t(key: string, params: { [key: string]: string | number } = {}) {
    const keys = key.split('.');
    const translation = keys.reduce((a, k) => a = (a as Translation)?.[k], this.translations[this.currentLocale]) as string
      || keys.reduce((a, k) => a = (a as Translation)?.[k], this.translations[this.defaultLocale]) as string
      || key;

    return translation.replace(/\{\{(\w+)\}\}/g, (_, param) => (params[param] || GAME_CONFIG[param as keyof typeof GAME_CONFIG]) as string || '');
  }

  getAvailableLocales() {
    return Object.keys(this.translations);
  }
}
