import {google} from '@ai-sdk/google'
import {createMCPClient} from '@ai-sdk/mcp'
import {generateText, stepCountIs} from 'ai'
import {NextResponse} from 'next/server'
import {z} from 'zod'
import {checkRateLimit, getClientKey} from '../../../lib/rateLimit'

export const runtime = 'nodejs'

const MAX_QUESTION_LENGTH = 500
const REQUEST_TIMEOUT_MS = 30_000

const requestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
})

class RequestTimeoutError extends Error {
  constructor() {
    super('Investigation timed out')
    this.name = 'RequestTimeoutError'
  }
}

const instructions = `
You are an incident investigation agent. Use the Sanity Context tools before answering every
incident question. Treat the knowledge base as the only source of operational facts.

Trace relevant relationships across incidents, affected services, dependencies, deployments,
changes, and runbooks. Never present correlation as confirmed causation. Organize the answer as:

1. Answer
2. Confirmed evidence
3. Inferences (only when useful, clearly labelled)
4. Recommended next step
5. Sources

Every important claim must cite the source names or paths returned by the knowledge base. If the
knowledge base does not support an answer, state exactly what evidence is missing. Do not guess.
`

export async function POST(request: Request) {
  const mcpUrl = process.env.SANITY_CONTEXT_MCP_URL
  const sanityToken = process.env.SANITY_ORGANIZATION_TOKEN

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !mcpUrl || !sanityToken) {
    return NextResponse.json(
      {error: 'Server credentials are missing. Check the agent .env.local file.'},
      {status: 503},
    )
  }

  const limit = checkRateLimit(getClientKey(request))
  const rateHeaders = {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': String(limit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(limit.resetAt / 1000)),
  }

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))
    return NextResponse.json(
      {
        error: 'Too many investigations.',
        retryAt: new Date(limit.resetAt).toISOString(),
      },
      {status: 429, headers: {...rateHeaders, 'Retry-After': String(retryAfter)}},
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'Request body must be valid JSON.'}, {status: 400, headers: rateHeaders})
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    const tooLong =
      typeof body === 'object' &&
      body !== null &&
      'question' in body &&
      typeof body.question === 'string' &&
      body.question.length > MAX_QUESTION_LENGTH

    return NextResponse.json(
      {
        error: tooLong
          ? `Keep the question under ${MAX_QUESTION_LENGTH} characters.`
          : 'Enter an incident question.',
      },
      {status: 400, headers: rateHeaders},
    )
  }

  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined
  let stage: 'sanity' | 'gemini' = 'sanity'
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort()
        reject(new RequestTimeoutError())
      }, REQUEST_TIMEOUT_MS)
    })

    const investigation = async () => {
      mcpClient = await createMCPClient({
        transport: {
          type: 'http',
          url: mcpUrl,
          headers: {Authorization: `Bearer ${sanityToken}`},
        },
      })
      const tools = await mcpClient.tools()
      stage = 'gemini'

      return generateText({
        model: google('gemini-3.6-flash'),
        system: instructions,
        prompt: parsed.data.question,
        tools,
        stopWhen: stepCountIs(8),
        abortSignal: controller.signal,
        maxRetries: 0,
      })
    }

    const result = await Promise.race([investigation(), timeout])
    return NextResponse.json({answer: result.text}, {headers: rateHeaders})
  } catch (error) {
    const apiError = error as {message?: string; status?: number; statusCode?: number}
    const status = apiError.status ?? apiError.statusCode
    const message = apiError.message ?? ''
    console.error('Incident investigation failed', {stage, status, message})

    if (error instanceof RequestTimeoutError || controller.signal.aborted) {
      return NextResponse.json(
        {error: 'The investigation took too long and was stopped. Please retry.'},
        {status: 504, headers: rateHeaders},
      )
    }

    const quotaExceeded =
      status === 429 ||
      /quota exceeded|exceeded your current quota|rate limit/i.test(message)

    if (quotaExceeded) {
      const retryMatch = message.match(/retry in ([\d.]+)s/i)
      const retryAfter = retryMatch ? Math.max(1, Math.ceil(Number(retryMatch[1]))) : null
      return NextResponse.json(
        {
          error: 'The Gemini free-tier limit was reached.',
          ...(retryAfter
            ? {retryAt: new Date(Date.now() + retryAfter * 1000).toISOString()}
            : {}),
        },
        {
          status: 429,
          headers: {
            ...rateHeaders,
            ...(retryAfter ? {'Retry-After': String(retryAfter)} : {}),
          },
        },
      )
    }

    if (stage === 'sanity') {
      const authFailure = status === 401 || status === 403 || message.includes('Missing Sanity session')
      return NextResponse.json(
        {
          error: authFailure
            ? 'The knowledge base credentials were rejected. Contact the site owner.'
            : 'The knowledge base is temporarily unavailable. No unsupported answer was generated.',
        },
        {status: authFailure ? 503 : 502, headers: rateHeaders},
      )
    }

    if (status === 404) {
      return NextResponse.json(
        {error: 'The configured Gemini model is unavailable. Contact the site owner.'},
        {status: 503, headers: rateHeaders},
      )
    }

    return NextResponse.json(
      {error: 'Gemini could not complete the investigation. Please retry.'},
      {status: 502, headers: rateHeaders},
    )
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    await mcpClient?.close().catch(() => undefined)
  }
}
