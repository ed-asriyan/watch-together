import { addMessages, getLocaleFromNavigator, init, locale } from 'svelte-i18n';
import en from './_';
import fr from './fr';
import ru from './ru';

export const locales = {
    en,
    fr,
    ru,
};

const fallbackLocale = 'en';
const localStorageKey = 'locale';

const getLocaleFromQuery = function() {
    const params = new URLSearchParams(location.search);
    const lang = params.get('lang');
    if (lang) {
        params.delete('lang');
        const newUrl = `${location.pathname}?${params.toString()}`;
        history.replaceState(null, '', newUrl);
    }
    return lang;
};

const getLocale = function() {
    const lang = getLocaleFromQuery() || localStorage.getItem(localStorageKey) || getLocaleFromNavigator();
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
