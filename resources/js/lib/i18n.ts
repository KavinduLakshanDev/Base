// Simple i18n utility for translations
import enTranslations from './i18n/locales/en.json';
import siTranslations from './i18n/locales/si.json';
import taTranslations from './i18n/locales/ta.json';

type Translations = Record<string, any>;

const translations: Record<string, Translations> = {
    en: enTranslations,
    si: siTranslations,
    ta: taTranslations,
};

let currentLanguage: string = localStorage.getItem('language') || 'en'; // Default language

export const setLanguage = (lang: string) => {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
    }
};

export const getLanguage = () => currentLanguage;

export const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage];

    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            value = undefined;
            break;
        }
    }

    if (typeof value === 'string') {
        if (params) {
            return Object.keys(params).reduce((str, paramKey) => {
                return str.replace(new RegExp(`\\$\\{${paramKey}\\}`, 'g'), params[paramKey]);
            }, value);
        }
        return value;
    }

    // Fallback to English if translation not found
    value = translations['en'];
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            value = undefined;
            break;
        }
    }

    if (typeof value === 'string') {
        if (params) {
            return Object.keys(params).reduce((str, paramKey) => {
                return str.replace(new RegExp(`\\$\\{${paramKey}\\}`, 'g'), params[paramKey]);
            }, value);
        }
        return value;
    }

    // Return the key if no translation found
    return key;
};
