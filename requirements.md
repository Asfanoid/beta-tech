# Product Requirements

## Purpose and users

Build an operational interface for field and production personnel to find a machine, locate a component, understand its part definition, and safely make an available update. The interface should be usable without knowledge of UUIDs, API paths, or lifecycle rules.

## Primary workflow

1. Select a returned machine by serial number.
2. Navigate its assembly and select a component occurrence.
3. Inspect the referenced part's name, number, unit, status, and the occurrence quantity.
4. Review an available status change or edit the unit.
5. Confirm the shared part-definition update and receive a clear result.

## Required outcomes

- **Machine selection:** Search only machines returned by the service. Show the selected serial number and returned count; do not imply the results are the complete fleet unless confirmed.
- **Assembly navigation:** Show human-readable part information and quantity. Keep repeated configuration occurrences separate, even when they reference the same part. Selecting an occurrence and expanding it are distinct actions. A child-load failure must preserve the rest of the assembly and allow retry.
- **Part inspection:** Clearly distinguish the selected assembly occurrence from its reusable part definition. Keep technical identifiers secondary.
- **Status changes:** The service determines which statuses are allowed. Refresh the selected part and allowable statuses when a technician starts a status change. Do not show confirmation or submit if the refreshed state no longer permits the selected transition.
- **Shared updates:** Status and unit changes affect the part definition, not just the selected machine occurrence. Explain this before confirmation. Do not report success until confirmed by the service.
- **Failure safety:** Preserve machine and occurrence context when requests fail. Do not treat failed reads as empty results. A lost mutation response has an unknown outcome: do not retry the write automatically; verify the part with a read before enabling another update.
- **Field usability:** Support keyboard and touch interaction, with a landscape-tablet workflow that remains usable on desktop and phone layouts. Communicate status with text, not color alone.

## Security and scope

Keep the service API key server-side and use the application's same-origin API routes for browser requests. The app has no user authentication; do not expose it publicly until access control and backend authorization are confirmed.

The first release does not include assembly structure edits, search beyond machines returned by the service, temporal history, offline writes, or cross-machine impact analysis.

## Unresolved service questions

- Does the root response contain the complete fleet, or is it limited or paginated?
- What access control is required before this app can be used outside local development?
- Can a status update affect allowable transitions for related parts, and how does the service handle concurrent changes?
