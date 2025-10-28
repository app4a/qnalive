import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locale labels for UI
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  // If invalid, default to 'en' instead of using notFound()
  const validLocale = locales.includes(locale as Locale) 
    ? (locale as string)
    : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`./messages/${validLocale}.json`)).default,
  };
});

