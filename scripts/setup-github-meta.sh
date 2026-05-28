#!/usr/bin/env bash
# One-shot script to set GitHub repo SEO metadata for shirenchuang/abpets.
#
# Sets:
#   - description (shows in GitHub search results)
#   - homepage URL (npm/site link in the right sidebar)
#   - topics (powers the github.com/topics/<name> discovery pages)
#
# Prereqs:
#   gh auth login    # one-time
#
# Run:
#   bash scripts/setup-github-meta.sh

set -euo pipefail

REPO="shirenchuang/abpets"

DESCRIPTION="Desktop pets for AI coding agents — Claude Code, Codex, Cursor, GitHub Copilot, Cline, Gemini. Install via npx into ~/.codex/pets and ~/.agentbro/pets."

HOMEPAGE="https://www.agentbro.net/pets"

# GitHub topic slugs must be lowercase, ≤35 chars, alphanumeric + dashes.
# Aim for topics with existing search traffic (github.com/topics/<slug>):
#   claude-code, cursor, github-copilot, codex, gemini-cli, cline — proven agent topics
#   ai-agent, ai-coding-assistant — broader umbrella discovery
#   desktop-pet, virtual-pet, mascot — visual-personality discovery
#   pixel-art, spritesheet, sprite — art-tool discovery
#   cli, marketplace, agentbro — product/category positioning
TOPICS=(
  agentbro
  ai-agent
  ai-coding-assistant
  claude-code
  codex
  codex-desktop
  cursor
  github-copilot
  cline
  gemini-cli
  desktop-pet
  virtual-pet
  mascot
  pixel-art
  spritesheet
  sprite
  cli
  marketplace
  macos
  nodejs
)

echo "▶ Setting description + homepage for $REPO"
gh repo edit "$REPO" \
  --description "$DESCRIPTION" \
  --homepage "$HOMEPAGE"

echo "▶ Setting topics ($(echo "${TOPICS[@]}" | wc -w | tr -d ' ') topics)"
# `gh repo edit --add-topic` accepts comma-separated.
gh repo edit "$REPO" --add-topic "$(IFS=,; echo "${TOPICS[*]}")"

echo
echo "✓ Done. Verify at https://github.com/$REPO"
echo
echo "Resulting metadata:"
gh repo view "$REPO" --json description,homepageUrl,repositoryTopics \
  --jq '{description, homepageUrl, topics: [.repositoryTopics[].name]}'
