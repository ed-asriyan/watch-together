import { addMessages, getLocaleFromNavigator, init, locale } from 'svelte-i18n';
import en from './_';
import ru from './ru';

export const locales = {
    en,
    ru,
};

const fallbackLocale = 'en';
const localStorageKey = 'locale';

const getLocale = function() {
    const lang = localStorage.getItem(localStorageKey) || getLocaleFromNavigator();
    if (locales[lang]) {
        return lang;
    }
    return fallbackLocale;
};

export const initI18n = function () {
    for (const [code, locale] of Object.entries(locales)) {
        addMessages(code, locale);
    }

    init({
        fallbackLocale,
        initialLocale: getLocale(),
    });

    locale.subscribe(value => localStorage.setItem(localStorageKey, value as string));
}
