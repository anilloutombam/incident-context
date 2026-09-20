import {google} from '@ai-sdk/google'
import {createMCPClient} from '@ai-sdk/mcp'
import {generateText, stepCountIs} from 'ai'
import {NextResponse} from 'next/server'

export const runtime = 'nodejs'

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

  const body = (await request.json()) as {question?: unknown}
  if (typeof body.question !== 'string' || !body.question.trim()) {
    return NextResponse.json({error: 'Enter an incident question.'}, {status: 400})
  }

  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined

  try {
    mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: mcpUrl,
        headers: {Authorization: `Bearer ${sanityToken}`},
      },
    })
    const tools = await mcpClient.tools()
    const result = await generateText({
      model: google('gemini-3.6-flash'),
      system: instructions,
      prompt: body.question.trim(),
      tools,
      stopWhen: stepCountIs(8),
    })
    return NextResponse.json({answer: result.text})
  } catch (error) {
    console.error('Incident investigation failed', error)

    const apiError = error as {status?: number; statusCode?: number}
    if (apiError.status === 429 || apiError.statusCode === 429) {
      return NextResponse.json(
        {error: 'The Gemini free-tier rate limit was reached. Wait briefly and retry.'},
        {status: 429},
      )
    }

    return NextResponse.json(
      {error: 'The knowledge source could not be reached. No unsupported answer was generated.'},
      {status: 502},
    )
  } finally {
    await mcpClient?.close().catch(() => undefined)
  }
}
