import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  return new Response('Socket.IO server', {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

