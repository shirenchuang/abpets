# abpets

[![npm version](https://img.shields.io/npm/v/abpets?color=22c55e&logo=npm)](https://www.npmjs.com/package/abpets)
[![npm downloads](https://img.shields.io/npm/dm/abpets?color=22c55e)](https://www.npmjs.com/package/abpets)
[![node](https://img.shields.io/node/v/abpets?color=339933&logo=node.js)](https://nodejs.org)
[![license](https://img.shields.io/github/license/shirenchuang/abpets?color=blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/shirenchuang/abpets?style=social)](https://github.com/shirenchuang/abpets)

> Install community pets for [AgentBro](https://www.agentbro.net) and [Codex Desktop](https://github.com/openai/codex) — one command, no config.

```bash
npx abpets install luffy
```

That's it. `abpets` downloads the pet's spritesheet + `pet.json` and drops them into **both** `~/.codex/pets/<slug>/` and `~/.agentbro/pets/<slug>/`. Whichever app you use will pick the pet up automatically.

## Commands

```
abpets install <slug>     install a pet from the community
abpets list               list locally installed pets
abpets uninstall <slug>   remove a pet from your machine
abpets search [query]     search the community for pets
```

## Examples

```bash
# Install
npx abpets install luffy

# Browse what's available
npx abpets search
npx abpets search pirate

# See what you have installed
npx abpets list

# Remove
npx abpets uninstall luffy
```

## Install paths

| App            | Directory               |
| -------------- | ----------------------- |
| Codex Desktop  | `~/.codex/pets/<slug>/` |
| AgentBro       | `~/.agentbro/pets/<slug>/` |

Each pet directory contains:

```
<slug>/
├── pet.json          # id, displayName, description, spritesheetPath
└── spritesheet.webp  # 1536 × 1872, 8 × 9 frame grid
```

## Authoring a pet

`abpets` only installs — to upload your own pet, head to https://www.agentbro.net/pets and use the in-browser uploader. Once approved, anyone can `npx abpets install <your-slug>`.

## Configuration

| Env var      | Default                                                       | Purpose            |
| ------------ | ------------------------------------------------------------- | ------------------ |
| `ABPETS_API` | `https://agentbro-pets-api-production.agentbro.workers.dev`   | API base URL       |

Useful for local development of the community itself:

```bash
ABPETS_API=http://localhost:8787 abpets search
```

## Requirements

- Node.js ≥ 18 (uses the built-in `fetch` and `node:zlib`)
- Zero npm dependencies — fast cold start, small footprint

## License

MIT
