import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const cli = fileURLToPath(
  new URL('../node_modules/mcp-failure-lab/dist/cli.js', import.meta.url),
)

const scenarios = [
  'tests/mcp/faults/bounded-delay.json',
  'tests/mcp/faults/hang-timeout.json',
  'tests/mcp/faults/malformed-response.json',
  'tests/mcp/faults/connection-loss.json',
]

for (const scenario of scenarios) {
  const result = spawnSync(process.execPath, [cli, 'run', scenario], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`MCP resilience suite passed (${scenarios.length} scenarios).`)
