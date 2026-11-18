# Testing

Use mocked API responses for failure and mutation scenarios. Do not change production data to create test cases.

## Behavior matrix

| Scenario           | Setup and action                                                                    | Expected result                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Shared part        | Two configuration occurrences reference one part; inspect each                      | Both occurrences remain separate with their own quantity; part data can be reused                     |
| Leaf node          | Child request returns an empty list; expand the node                                | It becomes a leaf and its row label does not shift                                                    |
| Selection race     | Select part A, then B; let A respond last                                           | B remains selected and its details stay visible                                                       |
| Valid transition   | API returns one allowable status; choose it                                         | Only the returned transition can proceed to confirmation                                              |
| Stale transition   | The pre-confirmation refresh removes the choice or returns a changed current status | Confirmation and mutation are blocked; refreshed status choices are shown                             |
| Successful update  | Update returns the changed part                                                     | The new part data is shown for visible occurrences and transition data is refreshed                   |
| Rejected update    | Update returns a documented rejection                                               | No success is shown; the current part or allowable choices can be refreshed                           |
| Lost response      | Update connection fails, or its response is interrupted, after submission           | No automatic retry occurs; the UI verifies by reading and keeps writes disabled if verification fails |
| Failed child read  | Child request fails; retry it                                                       | Existing tree context remains, and retry can load the branch                                          |
| Keyboard selection | Search and operate the machine selector without a mouse                             | Filtering, selection, and dismissal work by keyboard                                                  |

Add focused unit tests for API request validation and shared error handling. Prefer workflow/component tests for user-visible behavior; do not require a separate test for every presentational component.

## Verification

```bash
npm test
npm run lint
npm run build
```

Run `npm run types:api` only when the OpenAPI contract changes, then review the generated diff. Use an approved non-production target for any live mutation testing.
