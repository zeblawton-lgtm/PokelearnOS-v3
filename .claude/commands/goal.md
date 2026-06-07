---
description: Orchestrate work from GOAL.md by delegating to the architect agent and SDLC specialists. Use to plan, advance, or audit the project.
argument-hint: "[audit | status | next | <directive>] (optional)"
allowed-tools: Read, Glob, Grep, Task
---

# /goal — PokéLearnOS SDLC Orchestrator

## Step 1 — Load context (in order)
1. `GOAL.md` — spec, deliverable, release gate
2. `AGENTS.md` — conventions and stack constraints
3. `DECISIONS.md` — prior architecture decisions
4. Existing artifacts under `artifacts/`, `lib/`, `system/`, `iso/`, `docs/`

## Step 2 — Interpret `$ARGUMENTS`
- **none / `next`** → delegate to `architect` to plan and execute the next
  concrete step toward the release gate.
- **`status`** → report release-gate progress against `GOAL.md §9` and stop. No
  delegation.
- **`audit`** → delegate to `qa-reviewer` to verify release-gate items against
  the actual repo. Report; do not auto-fix.
- **anything else** → pass to `architect` as a directive.

## Step 3 — Delegate
For everything except `status`, launch `architect` with the relevant release-gate
items and the user's directive, plus a reminder that scope deviations from
`GOAL.md` must be surfaced, not silently taken. The architect fans out to
specialists (`content-designer`, `frontend-engineer`, `backend-engineer`,
`platform-engineer`, `qa-reviewer`) in parallel where independent.

## Step 4 — Collect & present
1. High-level summary (3–8 bullets)
2. Proposed `DECISIONS.md` entries — present for approval before appending
3. Updated release-gate checklist
4. Next recommended `/goal` invocation

## Guardrails
- Never run `install.sh`, `flash-usb.sh`, or anything touching `/etc`, `/opt`, or
  the system. Specialists produce scripts; the human runs them.
- Never commit `.env` or secrets. Keep `pnpm run typecheck` green before claiming done.
- Never write copyrighted Pokémon lore/dialogue or redistribute bundled assets.
- If `GOAL.md` and the request conflict, ask the user to update `GOAL.md` first.
