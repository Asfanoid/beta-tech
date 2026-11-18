# Temporal Control Interface — Claude Code Instructions

## Project context

This repository implements a Temporal Control Interface for field technicians and production personnel.

The application is a Next.js App Router project using React and TypeScript. It communicates with an existing Temporal Configuration Service.

The application is already partially implemented, and the project owner reports successful live API reads and writes. **Do not rebuild existing functionality simply because an implementation plan describes it as a future task.**

The objective is to complete, refine, test, and validate the existing application against its requirements.

## Required reading

Before making changes, read:

1. `requirements.md` — functional requirements and acceptance criteria.
2. `architecture.md` — domain boundaries, dependencies, and technical decisions.
3. `design.md` — user workflows, interaction design, responsive behavior, and accessibility.
4. `plan.md` — implementation status and outstanding work.
5. `testing.md` — existing coverage, remaining scenarios, and verification strategy.
6. `AGENTS.md` — repository-specific Next.js agent instructions.

Read the relevant Next.js documentation under `node_modules/next/dist/docs/` before modifying framework-specific code, as required by `AGENTS.md`.

Inspect the current implementation and Git state before deciding what work remains. Where planning documents describe an older implementation state, verify the repository rather than assuming the work is missing.

## Architectural boundaries

Maintain the existing lightweight separation:

- **Parts domain:** part definitions, attributes, lifecycle status, and allowable transitions.
- **Configurations domain:** assembly occurrences, parent-child relationships, quantities, and machine serial numbers.
- **Assembly Explorer:** composes both domains into the technician's workflow.
- **Shared infrastructure:** authenticated API transport, generated contracts, and shared error handling.

Configurations reference Parts using `partUuid`. They retain independent configuration identities.

Do not introduce unnecessary architectural layers, generic repositories, global state management, or additional dependencies without a concrete need.

The backend remains authoritative for configuration structure and lifecycle rules.

## API contract and security

- Use generated OpenAPI types from `lib/api/generated.ts`.
- Regenerate types with `npm run types:api` when the contract changes.
- Never manually modify generated types.
- Do not duplicate backend schemas or implement client-side status-transition rules.
- Keep `API_KEY` server-side and never expose it in browser bundles, logs, or commits.
- Use the existing same-origin Route Handlers for browser requests.
- Do not introduce undocumented API endpoints.
- Do not perform exploratory production mutations.
- Do not publicly deploy the unauthenticated application proxy.

Use controlled fixtures and mocked responses when testing mutations or failures. The project owner reports successful live reads and writes; verify the environment and authorization context before making further live mutations.

## User experience principles

Follow `design.md`.

The interface should allow a technician with minimal training to:

1. Find a machine using its serial number.
2. Navigate its assembly hierarchy.
3. Identify and inspect a component.
4. Understand its current part status and allowed transitions.
5. Safely review and confirm an update.

Prioritize landscape tablets while retaining effective desktop and phone layouts.

Keep technical identifiers secondary to human-readable part information.

Maintain the distinction between a configuration occurrence and its referenced shared part definition.

Do not sacrifice existing functionality or accessibility for visual changes.

## Working procedure

For each assigned task:

### 1. Inspect

- Read the relevant specifications and implementation.
- Determine what already works.
- Identify discrepancies between documentation and code.
- Avoid rewriting working functionality.

### 2. Plan

- Identify the smallest changes needed.
- State any significant assumptions or architectural tradeoffs.
- Flag conflicts with requirements before proceeding.

For review-only tasks, report findings without modifying files.

### 3. Implement

When implementation is requested:

- Make focused, maintainable changes.
- Reuse existing domain operations and components.
- Preserve established behavior unless the task explicitly changes it.
- Add or update relevant tests.
- Avoid speculative features and unrelated refactoring.

### 4. Verify

Run the narrowest relevant tests first.

Use the project's existing commands:

```bash
npm test
npm run lint
npm run build
```

Regenerate API types only when needed:

```bash
npm run types:api
```

Do not regenerate contracts unnecessarily or depend on production mutations to establish test coverage.

Report failing checks accurately. Do not claim a test passed unless it was executed successfully.

### 5. Report

Summarize:

- What changed and why.
- Which requirements were addressed.
- Tests executed and their results.
- Remaining limitations or uncertainties.
- Any architectural decisions that require documentation updates.

Do not report work as complete when acceptance criteria remain unmet.

## Testing priorities

Follow `testing.md`, with particular attention to:

- Distinct configuration and part identities.
- Lazy loading and leaf-node handling.
- Shared part updates.
- Stale allowable-status data.
- Concurrent selection and asynchronous response races.
- Network failures and rejected mutations.
- Keyboard accessibility and tablet usability.
- Preserving user context during errors.

Use deterministic mocks for failure scenarios. Avoid altering production data to manufacture test conditions.

## Scope discipline

The documented API defines the available backend capabilities.

Do not implement configuration creation, structural editing, fleet-wide search, historical timelines, offline writes, or cross-machine impact analysis without explicit requirements and API support.

Treat unresolved behavior as uncertainty, not permission to invent functionality.

## Cost-conscious execution

Use the provided coding environment efficiently.

- Prefer focused file inspection over repeated repository-wide exploration.
- Use existing installed dependencies and utilities.
- Avoid unnecessary additional agents or repeated analyses.
- Run focused tests before expensive full-project checks.
- Do not regenerate files or documentation without a reason.
- Prioritize correctness, reliability, and usability over architectural sophistication.

Cost efficiency must not come at the expense of safety or required verification.

## Engineering ownership

The project owner defines the product direction, requirements, and architectural decisions.

Claude assists with implementation, analysis, testing, and review.

When identifying a weakness or proposing an alternative, explain the technical reasoning and tradeoffs instead of silently replacing established decisions.

The objective is a reliable operational interface, not the largest possible implementation.
