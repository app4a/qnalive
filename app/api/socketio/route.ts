
export async function GET() {
  return new Response('Socket.IO server', {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

