import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n';
import Script from 'next/script';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Validate locale - if invalid, default to 'en'
  const validLocale = locales.includes(locale as any) ? locale : 'en';

  // Get messages for the specific locale
  const messages = await getMessages({ locale: validLocale });

  return (
    <NextIntlClientProvider messages={messages} locale={validLocale}>
      <Script id="locale-setter" strategy="beforeInteractive">
        {`
          document.documentElement.lang = '${validLocale}';
          if ('${validLocale}' === 'ko') {
            document.body.classList.remove('font-inter');
            document.body.classList.add('font-noto-sans-kr');
          } else {
            document.body.classList.remove('font-noto-sans-kr');
            document.body.classList.add('font-inter');
          }
        `}
      </Script>
      {children}
    </NextIntlClientProvider>
  );
}

