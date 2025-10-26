import Link from 'next/link'
import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, BarChart3, Users, Zap } from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'

export default async function LandingPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QnALive</span>
          </Link>
          <nav className="flex items-center space-x-4">
            {session?.user ? (
              <>
                <UserMenu userName={session.user.name} userEmail={session.user.email} />
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Engage Your Audience in Real-Time
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create interactive events with live Q&A, polls, and audience participation. 
          Perfect for conferences, webinars, classrooms, and town halls.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={session?.user ? "/dashboard/events/new" : "/auth/signup"}>
            <Button size="lg" className="text-lg px-8">
              Create Your Event
            </Button>
          </Link>
          <Link href="/join">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Join an Event
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need for Interactive Events
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Live Q&A</CardTitle>
              <CardDescription>
                Collect and prioritize questions from your audience in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Live Polls</CardTitle>
              <CardDescription>
                Create instant polls and see results update live as votes come in
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Audience Engagement</CardTitle>
              <CardDescription>
                Upvoting system helps surface the most popular questions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Real-Time Updates</CardTitle>
              <CardDescription>
                WebSocket-powered instant updates for all participants
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Event</h3>
            <p className="text-gray-600">
              Set up your event in seconds with a unique code
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Share Code</h3>
            <p className="text-gray-600">
              Share the 6-character code with your audience
            </p>
          </div>
          <div className="text-center">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Engage</h3>
            <p className="text-gray-600">
              Collect questions, run polls, and interact in real-time
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of event organizers using QnALive to create more engaging experiences
        </p>
        <Link href="/auth/signup">
          <Button size="lg" className="text-lg px-8">
            Create Your Free Event
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2025 QnALive. Built with Next.js, TypeScript, and PostgreSQL.</p>
        </div>
      </footer>
    </div>
  )
}

