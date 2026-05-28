import { c, DEFAULT_API, API_BASE } from './common.mjs'

export function printUsage() {
  const lines = [
    '',
    `  ${c.bold('abpets')} — install AgentBro pets`,
    '',
    `  ${c.cyan('Usage')}`,
    `    abpets install <slug>     install a pet from the community`,
    `    abpets list               list locally installed pets`,
    `    abpets uninstall <slug>   remove a pet from your machine`,
    `    abpets search [query]     search the community for pets`,
    `    abpets help               show this help`,
    '',
    `  ${c.cyan('Where pets land')}`,
    `    ~/.codex/pets/<slug>/`,
    `    ~/.agentbro/pets/<slug>/`,
    '',
    `  ${c.cyan('Environment')}`,
    `    ABPETS_API   API base URL`,
    `                 default: ${DEFAULT_API}`,
    `                 current: ${API_BASE}`,
    '',
  ]
  console.log(lines.join('\n'))
}
