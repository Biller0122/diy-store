# Shared Agent Workflow

This repository is edited by multiple Claude and Codex sessions. Every agent must use the same handoff process.

## Before Editing

1. Read `PROJECT_HANDOFF.md` completely.
2. Run `git status --short`, `git log -5 --oneline`, and inspect relevant diffs.
3. Treat all existing uncommitted changes as another agent's work. Preserve and extend them; never discard them silently.
4. Record the task in `PROJECT_HANDOFF.md` under `Active Work` before making broad changes.

## While Editing

- Follow the existing stack and patterns: Vendure, Next.js, Expo, PostgreSQL, AWS.
- The backend database is AWS RDS only. Never connect Vendure to local PostgreSQL and never use a local DB fallback.
- Default to local code/build/browser verification first.
- Do not commit, push, open a PR, or deploy unless the user explicitly approves that action after local verification.
- Keep unrelated changes out of the task and out of any future commit.

## Before Finishing

1. Run focused tests plus the affected app build when feasible.
2. Update `PROJECT_HANDOFF.md` with:
   - agent/session name,
   - files changed,
   - behavior implemented,
   - tests and results,
   - remaining issue or exact next step.
3. Leave the working tree understandable for the next agent.

## Scope Instructions

- More specific `AGENTS.md` files may add framework rules, but they do not replace this workflow.
- Claude reads `CLAUDE.md`, which imports these same instructions.
