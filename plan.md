# Plan — Potential Follow-ups

The core technician workflow is implemented. The following items remain for further evaluation and refinement.

## 1. Tablet navigation

The layout uses side-by-side panels on wide screens, stacked panels at widths up to 980px, and switches between views on phones.

- Review scrolling behavior on tablets, particularly when multiple scrollable regions are present.
- Consider simplifying scrolling while preserving assembly navigation and part context.

## 2. Status colours

The interface currently prioritizes readable status labels over colour coding.

- Evaluate whether a consistent colour scheme would improve status recognition.
- Confirm the operational meaning of service-defined statuses before assigning colours.
- Maintain accessible contrast and visible text labels.

## 3. Part workbench maintainability

**File:** `features/api-explorer/hooks/use-part-workbench.ts`

The hook coordinates part loading, editing, status transitions, mutations, and recovery. Status-choice consistency checking is already separated into `statusChoicesDescribePart`.

- Evaluate whether additional extraction would improve cohesion, testability, or change isolation.
- Avoid splitting the hook unless the benefit outweighs added state coordination and complexity.

## 4. Dependency security

A recent `npm audit` reported 16 high-severity findings, including a `picomatch` advisory affecting transitive development dependencies.

- Review currently available compatible fixes and apply them where appropriate.
- If a fix requires a breaking upgrade, assess compatibility and document any deferral; monitor upstream for a safer fix.
- Rerun `npm audit`, tests, lint, and build after dependency updates.

## Priorities

Tablet navigation and status presentation are user-facing refinements. Workbench refactoring and dependency remediation should be prioritized according to maintainability benefits, security exposure, compatibility, and risk.
