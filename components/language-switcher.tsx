'use client'

import { Globe } from 'lucide-react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locales, localeLabels, defaultLocale, type Locale } from '@/i18n'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return

    // Remove the current locale prefix from the pathname if it exists
    let newPathname = pathname
    for (const loc of locales) {
      if (pathname.startsWith(`/${loc}`)) {
        newPathname = pathname.slice(`/${loc}`.length) || '/'
        break
      }
    }

    // Add the new locale prefix (unless it's the default locale)
    if (newLocale !== defaultLocale) {
      newPathname = `/${newLocale}${newPathname}`
    }

    router.push(newPathname)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <Globe className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {localeLabels[locale as Locale]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? 'bg-gray-100' : ''}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

