# abpets — desktop pets for AI coding agents

[![npm version](https://img.shields.io/npm/v/abpets?color=22c55e&logo=npm)](https://www.npmjs.com/package/abpets)
[![npm downloads](https://img.shields.io/npm/dm/abpets?color=22c55e)](https://www.npmjs.com/package/abpets)
[![node](https://img.shields.io/node/v/abpets?color=339933&logo=node.js)](https://nodejs.org)
[![license](https://img.shields.io/github/license/shirenchuang/abpets?color=blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/shirenchuang/abpets?style=social)](https://github.com/shirenchuang/abpets)

> Install community-made desktop pets for **Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Cline, Gemini CLI**, and any agent hosted by [AgentBro](https://www.agentbro.net). One command, no config, zero npm dependencies.

```bash
npx abpets install luffy
```

That's it. `abpets` downloads the pet's spritesheet and `pet.json`, then drops them into **both** `~/.codex/pets/<slug>/` and `~/.agentbro/pets/<slug>/`. Whichever agent you talk to next picks the pet up automatically.

## Why a desktop pet for an AI coding agent?

Long-running agent sessions are invisible — the model is thinking, the build is running, an approval is pending — and you have no idea what's happening. A desktop pet gives the session a face: it waves when something needs you, runs when the agent is moving fast, sits down when it's failed. It's the "you have new mail" sound for the agent era, but cuter.

`abpets` is the install side of [agentbro.net/pets](https://www.agentbro.net/pets), an open community where anyone can publish a pet under their own GitHub handle (`alice/luffy`, `bob/luffy` — both are fine; slugs are unique per author, like GitHub repos).

## Commands

```
abpets install <handle/slug>   install a pet from the community
abpets install <slug>          shortcut; errors if the slug is ambiguous
abpets list                    list locally installed pets
abpets uninstall <slug>        remove a pet from your machine
abpets search [query]          search the community for pets
abpets login                   sign in with GitHub for submissions
abpets whoami                  show the signed-in account
abpets logout                  remove the local CLI session
abpets submit <path>           submit a local pet folder for review
abpets help                    print usage
```

## Examples

```bash
# Install (full reference — recommended)
npx abpets install shirenchuang/luffy

# Install by bare slug if it's not ambiguous
npx abpets install luffy

# Browse what's available
npx abpets search
npx abpets search pirate

# See what you have installed
npx abpets list

# Remove
npx abpets uninstall luffy

# Share your own pet
npx abpets login
npx abpets submit ~/.codex/pets/my-pet
```

## Which AI agents does this work with?

Pets use the **Codex Pet format**: a 1536 × 1872 spritesheet sliced into a 8 × 9 frame grid plus a tiny `pet.json` descriptor. `abpets` installs them into two well-known directories so they reach as many agents as possible:

| Directory                  | Read directly by      | Effectively reaches                                                                                                       |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `~/.codex/pets/<slug>/`    | OpenAI Codex Desktop  | Codex Desktop                                                                                                             |
| `~/.agentbro/pets/<slug>/` | AgentBro              | Any agent running through AgentBro — **Claude Code, Codex CLI, Cursor, GitHub Copilot, Cline, Gemini CLI**, custom CLIs   |

So one `abpets install` is enough: whether you talk to Claude Code, Cursor, Codex, or your own CLI tool, the pet shows up as long as AgentBro is the surface hosting the session.

Each installed directory contains exactly two files:

```
<slug>/
├── pet.json          # id, displayName, description, spritesheetPath
└── spritesheet.webp  # 1536 × 1872, 8 × 9 frame grid (idle, run, wave, jump, …)
```

## Authoring your own pet

Two ways to publish:

**From the browser** — head to **[agentbro.net/pets/upload](https://www.agentbro.net/pets/upload)**, sign in with GitHub, drop your spritesheet + `pet.json`. The pet enters a review queue. Once approved, anyone can run `npx abpets install <your-handle>/<slug>`.

**From the CLI** — `abpets login` opens GitHub login in your browser, stores a local session under `~/.abpets/`, and then `abpets submit ~/.codex/pets/<pet>` uploads the spritesheet + `pet.json` for review.

A starter spritesheet template and the 9 required animation states (idle, run-right, run-left, wave, jump, failed, waiting, running, review) are documented at [agentbro.net/pets](https://www.agentbro.net/pets).

## Configuration

| Env var      | Default                                                       | Purpose            |
| ------------ | ------------------------------------------------------------- | ------------------ |
| `ABPETS_API` | `https://agentbro-pets-api-production.agentbro.workers.dev`   | API base URL       |
| `ABPETS_WEB` | `https://www.agentbro.net`                                    | Website/login URL  |

Useful when contributing to the API itself:

```bash
ABPETS_API=http://localhost:8787 abpets search
```

## FAQ

### Does this work on Linux / Windows?
`abpets` itself runs anywhere Node 18+ runs. The pets it installs are rendered by **AgentBro** (macOS today; Windows and Linux on the roadmap) and **Codex Desktop** (macOS). On other platforms the files are installed but won't be shown until those apps land there.

### Do I need an AgentBro / Codex account to use the CLI?
No. Installing and listing pets is fully anonymous. You only need a (free) GitHub login if you want to **publish** your own pet to the community.

### Is there a paid marketplace?
Not yet. Every approved pet is free to install. The schema reserves a `priceCents` field for future paid pets, but the v1 community is fully free.

### Where do the files go?
Always two directories: `~/.codex/pets/<slug>/` and `~/.agentbro/pets/<slug>/`. The handle is only used for *publishing identity* — it isn't part of the on-disk path, since both Codex Desktop and AgentBro key by slug.

### Two people published the same slug (e.g. `luffy`). What happens?
The community allows it: each author has their own namespace. `npx abpets install luffy` will list all matches and ask you to pick one (`shirenchuang/luffy`, `alice/luffy`, …). Locally only one ever exists at `~/.codex/pets/luffy/`; install another and it overwrites.

### How do I verify a pet before installing?
Every approved pet has a detail page at `https://www.agentbro.net/pets/<handle>/<slug>` — you can play all 9 animations in-browser before downloading.

## Requirements

- **Node.js ≥ 18** — uses the built-in `fetch` and `node:zlib`
- **Zero npm dependencies** — fast cold start, 7 KB published tarball
- macOS / Linux / Windows for the CLI itself

## Related

- [AgentBro](https://www.agentbro.net) — the macOS hub for AI coding agents
- [agentbro.net/pets](https://www.agentbro.net/pets) — the community gallery
- [Codex Pet format spec](https://www.agentbro.net/pets) — spritesheet + JSON layout

## License

MIT © [shirenchuang](https://github.com/shirenchuang)
