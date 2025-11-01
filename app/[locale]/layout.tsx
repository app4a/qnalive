import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { locales } from '@/i18n'
import Script from 'next/script'

const isSupportedLocale = (value: string): value is (typeof locales)[number] =>
  locales.includes(value as (typeof locales)[number])

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validate locale - if invalid, default to 'en'
  const validLocale = isSupportedLocale(locale) ? locale : 'en'

  // Get messages for the specific locale
  const messages = await getMessages({ locale: validLocale })

  return (
    <NextIntlClientProvider messages={messages} locale={validLocale}>
      <Script id="locale-setter" strategy="afterInteractive">
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
  )
}

