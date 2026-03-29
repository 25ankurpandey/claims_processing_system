# Self-Review

## What's Good

1. **Domain Isolation via Shared Library**: Isolating all Enums and Interfaces directly into a `@claims/shared` library proved to be a fantastic architectural choice. The moment the backend engine adjudicates a status string, the Next.js frontend immediately knows how to render the exact corresponding UI pill without duplicate definitions.
2. **Robust State Enforcement**: The `STATE_TRANSITIONS` dictionary inside the `ClaimService` cleanly maps out the directed graph for claims. It completely prevents nonsensical states (e.g., a `CLOSED` claim cannot be marked `PAID`, a `SUBMITTED` claim cannot dive straight to `DISPUTED`).
3. **Actionable Adjudication Traces**: Re-calculating coverage logic is notoriously hard to debug. Our engine outputs a human-readable `explanation` string for every line item, embedding exactly *why* a denial occurred.
4. **API Test Coverage**: Our 51-assertion bash script aggressively tests limit tracking, deduplications, eager-loading relations, and invalid transitions.

## What's Rough

1. **No Concurrency Controls**: This is the biggest architectural vulnerability. Our `AdjudicationService.checkLimitUsage()` runs a `SUM(approved_amount)` query. Between running that query and saving the new `approved_amount`, a concurrent API request could evaluate against the same limit. This necessitates proper Database Transactions (`Sequelize.transaction`) or explicit row-level locking (e.g. `SELECT ... FOR UPDATE` on the Policy record).
2. **InversifyJS Setup Boilerplate**: The transition to `Symbol`-based tokens fixed our decorator circular dependency initialization crashes, but at the cost of high boilerplate. Every injection now requires `@inject(TYPES.ServiceName)`.
3. **Types vs Enums for Frontend**: Next.js App Router (especially SSR) struggles with importing `enum` values compiled from external TS packages if not bundled correctly. We had to use `const object` mock enums (e.g., `export const ClaimStatus = { APPROVED: 'APPROVED' } as const`) to bypass Webpack resolutions safely. It works beautifully but is a TypeScript workaround.

## What I'd Flag for Next Round
If we extend this system to an **Appeals Workflow**, we'll need to rethink `ClaimDal.getApprovedAmountForServiceType()`. Right now, it blindly sums historical `approved_amount` limits. If a claim is appealed and re-adjudicated, we must ensure we aren't double-counting limits or losing the historical log of the first adjudication's timeline. We would likely need to introduce a generic `AdjudicationEvent` audit table to implement event sourcing for the appeal lifecycle.
