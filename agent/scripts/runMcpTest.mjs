import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const token = process.env.SANITY_ORGANIZATION_TOKEN
if (!token) {
  console.error('SANITY_ORGANIZATION_TOKEN is required in .env')
  process.exit(1)
}

const cli = fileURLToPath(
  new URL('../node_modules/mcp-failure-lab/dist/cli.js', import.meta.url),
)

const result = spawnSync(
  process.execPath,
  [
    cli,
    'run',
    'tests/mcp/context-available.json',
    '--target',
    'tests/mcp/sanity-context.json',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      SANITY_CONTEXT_AUTHORIZATION: `Bearer ${token}`,
    },
  },
)

process.exit(result.status ?? 1)
