'use client'

import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, BarChart3, Users, Zap } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useTranslations } from 'next-intl'

interface LandingPageContentProps {
  session: any
}

export default function LandingPageContent({ session }: LandingPageContentProps) {
  const t = useTranslations('landing')
  const tCommon = useTranslations('common')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{tCommon('appName')}</span>
          </Link>
          <nav className="flex items-center space-x-4">
            {session?.user ? (
              <>
                <UserMenu userName={session.user.name} userEmail={session.user.email} />
                <Link href="/dashboard">
                  <Button>{t('header.dashboard')}</Button>
                </Link>
              </>
            ) : (
              <>
                <LanguageSwitcher />
                <Link href="/auth/signin">
                  <Button variant="ghost">{tCommon('signIn')}</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>{t('header.getStarted')}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
          {t('hero.title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={session?.user ? "/dashboard/events/new" : "/auth/signup"}>
            <Button size="lg" className="text-lg px-8">
              {t('hero.createEvent')}
            </Button>
          </Link>
          <Link href="/join">
            <Button size="lg" variant="outline" className="text-lg px-8">
              {t('hero.joinEvent')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t('features.title')}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <CardTitle>{t('features.liveQA.title')}</CardTitle>
              <CardDescription>
                {t('features.liveQA.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>{t('features.livePolls.title')}</CardTitle>
              <CardDescription>
                {t('features.livePolls.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>{t('features.engagement.title')}</CardTitle>
              <CardDescription>
                {t('features.engagement.description')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>{t('features.realtime.title')}</CardTitle>
              <CardDescription>
                {t('features.realtime.description')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-12">{t('howItWorks.title')}</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step1.title')}</h3>
            <p className="text-gray-600">
              {t('howItWorks.step1.description')}
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step2.title')}</h3>
            <p className="text-gray-600">
              {t('howItWorks.step2.description')}
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('howItWorks.step3.title')}</h3>
            <p className="text-gray-600">
              {t('howItWorks.step3.description')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">{t('cta.title')}</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('cta.subtitle')}
        </p>
        <Link href="/auth/signup">
          <Button size="lg" className="text-lg px-8">
            {t('cta.button')}
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>{t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  )
}

