import { auth } from '@/auth'
import LandingPageContent from './landing-page-content'

export default async function LandingPage() {
  const session = await auth()

  return <LandingPageContent session={session} />
}

