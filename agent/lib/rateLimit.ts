const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

type Entry = {count: number; resetAt: number}

const requests = new Map<string, Entry>()

export function checkRateLimit(key: string, now = Date.now()) {
  const current = requests.get(key)

  if (!current || current.resetAt <= now) {
    const entry = {count: 1, resetAt: now + WINDOW_MS}
    requests.set(key, entry)
    return {allowed: true, remaining: MAX_REQUESTS - 1, resetAt: entry.resetAt}
  }

  if (current.count >= MAX_REQUESTS) {
    return {allowed: false, remaining: 0, resetAt: current.resetAt}
  }

  current.count += 1
  return {allowed: true, remaining: MAX_REQUESTS - current.count, resetAt: current.resetAt}
}

export function getClientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'local'
}
