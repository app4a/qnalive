'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'

interface AppHeaderProps {
  session?: {
    user?: {
      name?: string | null
      email?: string | null
    }
  } | null
  leftContent?: ReactNode
  rightContent?: ReactNode
  showDashboardButton?: boolean
  showLanguageSwitcher?: boolean
}

export function AppHeader({ 
  session, 
  leftContent,
  rightContent,
  showDashboardButton = false,
  showLanguageSwitcher = false
}: AppHeaderProps) {
  const t = useTranslations('common')
  const tLanding = useTranslations('landing.header')

  return (
    <header className="border-b bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/80">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Left section */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            {leftContent || (
              <Link href="/" className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <span className="text-lg md:text-2xl font-bold whitespace-nowrap">
                  {t('appName')}
                </span>
              </Link>
            )}
          </div>

          {/* Right section */}
          <nav className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {rightContent || (
              <>
                {session?.user ? (
                  <>
                    <UserMenu userName={session.user.name} userEmail={session.user.email} />
                    {showDashboardButton && (
                      <Link href="/dashboard">
                        <Button size="sm" className="md:text-base">
                          {tLanding('dashboard')}
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    {showLanguageSwitcher && <LanguageSwitcher />}
                    <Link href="/auth/signin">
                      <Button variant="ghost" size="sm" className="md:text-base">
                        {t('signIn')}
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button size="sm" className="md:text-base">
                        {tLanding('getStarted')}
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

