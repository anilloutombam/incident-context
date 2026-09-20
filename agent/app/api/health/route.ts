import {NextResponse} from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  const configuration = {
    gemini: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    sanityContextUrl: Boolean(process.env.SANITY_CONTEXT_MCP_URL),
    sanityToken: Boolean(process.env.SANITY_ORGANIZATION_TOKEN),
  }
  const ready = Object.values(configuration).every(Boolean)

  return NextResponse.json(
    {
      status: ready ? 'ok' : 'degraded',
      service: 'incident-context-agent',
      configuration,
    },
    {
      status: ready ? 200 : 503,
      headers: {'Cache-Control': 'no-store'},
    },
  )
}
