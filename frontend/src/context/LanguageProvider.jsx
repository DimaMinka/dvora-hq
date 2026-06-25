import { useState, useEffect } from 'react';
import { LanguageContext } from './LanguageContext.jsx';
import en from '../locales/en.json';
import he from '../locales/he.json';

const locales = { en, he };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('dvora_lang') || 'en';
  });

  const isRtl = lang === 'he';

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('dvora_lang', lang);
  }, [lang, isRtl]);

  const t = (path, variables = {}) => {
    const keys = path.split('.');

    // Resolve for current language
    let result = locales[lang];
    let found = true;
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        found = false;
        break;
      }
    }

    // Fallback to English if not found
    if (!found) {
      result = locales.en;
      for (const key of keys) {
        if (result && result[key] !== undefined) {
          result = result[key];
        } else {
          return path; // Fallback to key path if totally missing
        }
      }
    }

    // Interpolate string variables
    if (typeof result === 'string') {
      let text = result;
      for (const [vName, vVal] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{${vName}}`, 'g'), String(vVal));
      }
      return text;
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRtl, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
