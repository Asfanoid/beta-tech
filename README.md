# Chronos Temporal Control

A technician-focused interface for exploring a time machine's assembly, inspecting components, and safely updating shared part definitions.

Designed with tablet use in mind for field technicians and production personnel, prioritizing clear navigation, human-readable information, and explicit update confirmation.

## Local setup

Requires Node.js and npm.

Create a private `.env.local` file in the project root:

```dotenv
API_URL=<api-url>
API_KEY=<service-api-key>
```

`API_URL` should point to the backend API root, ending in `/api/`.

`API_KEY` is a server-side secret. Do not expose it to browser code, commit it, or include it in logs.

The server-side proxy protects the API key from browser exposure but does not authenticate application users. Keep the application local until appropriate user access control and backend authorization are established.

Install dependencies and start the application:

```bash
npm ci
npm run dev
```

## Useful commands

```bash
npm test
npm run lint
npm run build
```

### Regenerating API types

API types are generated from the backend's OpenAPI schema rather than maintained manually.

When the backend contract changes, regenerate them using:

```bash
npm run types:api
```

The generator resolves the schema at `../doc` relative to `API_URL`. Type generation does not require `API_KEY`.

## Approach and tradeoffs

- **One workflow, two concepts.** The Assembly Explorer answers: "Which machine? Where is the component? What is it? What change is safe?" Configuration entries represent individual occurrences with their own quantity and position in the hierarchy, while the details panel distinguishes those occurrences from the shared part definitions they reference.

- **Tablet-focused interaction.** The interface uses a responsive layout with assembly navigation and component details. Human-readable part names, explicit status choices, and confirmation steps reduce reliance on API knowledge.

- **Machine discovery and lazy assembly loading.** Machine search filters only the root machines returned by the service; the application does not establish whether this represents the full fleet. The backend returns one level of assembly children per request, so branches load when expanded and are cached. Visible part names are resolved through a shared, deduplicated lookup cache with limited concurrency.

- **Server-side proxy.** Browser requests use same-origin Next.js Route Handlers, which attach the API key server-side and map upstream failures to consistent error responses. This protects the service key from browser exposure but is not a substitute for user authentication.

- **Backend-owned rules.** Only service-returned status transitions are presented. Starting a status change refreshes the part and its allowable statuses to detect stale selections before confirmation. This does not eliminate races between validation and the subsequent write. The backend remains responsible for enforcing transition rules, and the UI handles rejected updates by refreshing the available choices.

- **Explicit shared updates.** Confirmation identifies the shared part definition and explains that changes may affect every configuration referencing it. Success is reported only when the service confirms the update.

- **Uncertain mutation outcomes.** If a write response is lost, the application does not automatically retry the mutation. Instead, it reads the current part state to reconcile the observed values. A matching state does not prove whether the interrupted request caused the change. Further updates are paused if verification fails, while browsing remains available.

- **Deliberately limited scope.** No global state library or generic data layer. Hooks coordinate the user workflows, while generated OpenAPI types define the service data contracts. Additional capabilities beyond the documented API are intentionally excluded.

## Project documents

- [Requirements](requirements.md): User outcomes and product constraints.
- [Architecture](architecture.md): System principles and responsibility boundaries.
- [Design](design.md): Technician workflow and interaction design.
- [Testing](testing.md): Test scenarios and verification commands.
- [Plan](plan.md): Outstanding work and potential refinements.
