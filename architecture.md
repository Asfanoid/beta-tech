# Architecture

## Principles

1. Parts and Configurations are separate concepts with independent identities.
2. The Assembly Explorer composes them into the technician workflow; it is not a new domain.
3. The OpenAPI contract defines API data shapes. The backend owns assembly structure and lifecycle rules.
4. The frontend owns interaction state, presentation, request feedback, and safe update flows.
5. Tests verify observable behavior, especially shared updates and failures.

## Responsibilities

- **`app/`** — Next.js routes, page entry points, and server-side HTTP boundaries.
- **`domains/`** — Business concepts, domain-facing types, and the server-side API operations used by Route Handlers. Parts and Configurations remain independent.
- **`features/`** — User workflows. Browser hooks call the same-origin Route Handlers through `lib/api/browser-client.ts`. The Assembly Explorer owns navigation and interaction state.
- **`lib/api/`** — Generated API contracts, authenticated transport, and shared HTTP error handling.
- **Tests** — Colocate focused unit and component tests with the behavior they verify. Keep end-to-end tests separate if introduced.

## Boundaries

- Use generated OpenAPI types; do not hand-edit generated contracts or duplicate API schemas.
- Keep the API key on the server. Browser requests use same-origin routes and never receive upstream credentials.
- Keep status-transition and configuration-structure rules in the backend. The frontend presents service-provided choices and safely handles the result.
- Avoid additional global state, generic data layers, or abstractions unless a concrete requirement needs them.

The current same-origin API proxy does not authenticate application users. Keep it local until suitable app-level access control and backend authorization are confirmed.
