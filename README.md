# Chronos Temporal Control

A technician-facing interface for selecting a returned time machine, navigating its assembly, inspecting a part, and safely updating that shared part definition.

## Local setup

Requires Node.js and npm.

```bash
npm ci
npm run dev
```

Create a private `.env.local` in the project root:

```dotenv
API_URL=<api-url>
API_KEY=<service-api-key>
```

`API_KEY` is a server-side secret. Do not expose it to browser code, commit it, or include it in logs. The app has no user sign-in; keep the proxy local until app-level access control and backend authorization are confirmed.

## Useful commands

```bash
npm run types:api
npm test
npm run lint
npm run build
```

The API schema is served at `/doc` relative to `API_URL`. Type generation does not require `API_KEY`.

## Approach and tradeoffs

- **One workflow, two concepts.** The Assembly Explorer answers "Which machine? Where is the component? What is it? What change is safe?". Configuration rows are _occurrences_ with their own quantity and path; the details panel separates that occurrence from the shared _part definition_ it references.
- **Server-side proxy.** Browser code calls same-origin Route Handlers, which add the API key on the server. The key never reaches the browser, and upstream failures are mapped to consistent responses.
- **Lazy assembly.** The API returns one level of children per request, so branches load when expanded and are cached. Part names are looked up per visible row through a shared, de-duplicated cache with a small concurrency limit.
- **The backend owns the rules.** Only service-returned status choices are offered. Starting a status change re-reads the part and its allowed statuses; if either changed, confirmation is blocked and the fresh choices are shown.
- **Shared updates are explicit.** Confirmation names the part definition and explains that every configuration using it is affected. Success is shown only after the service confirms it.
- **Lost responses are verified, not retried.** If an update's response is lost, its outcome is unknown. The app never repeats the write; it reads the part to determine the result and pauses all updates until that check succeeds, while browsing stays available.
- **Deliberately small.** No global state library or generic data layer; hooks own workflow state and the generated OpenAPI types define the data shapes.

## Project documents

- [Requirements](requirements.md): user outcomes and product constraints.
- [Architecture](architecture.md): responsibility boundaries and system principles.
- [Design](design.md): technician workflow and interaction behavior.
- [Testing](testing.md): scenarios and verification commands.
- [Plan](plan.md): unresolved work only.
