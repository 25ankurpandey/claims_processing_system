# Decisions & Trade-offs

## What We Built

- **Monorepo Architecture**: We selected `nx` to manage a Next.js frontend and an Express backend. We created a `libs/shared` package for enums/types. This ensures the frontend UI and backend API always speak the exact same domain language (e.g., `ClaimStatus`, `DenialReason`), preventing drift.
- **Relational DB / ORM**: We used PostgreSQL and Sequelize. Insurance data is inherently highly relational (Member -> Policy -> Claims -> LineItems) and transactional. A NoSQL approach would have made limit-tracking aggregations unnecessarily complex.
- **InversifyJS (IoC)**: We implemented a strict Dependency Injection container using `Symbol` tokens. This decouples our Controllers from our Services and DAL (Data Access Layer), making unit/integration testing trivial by swapping in mock repositories.
- **Line-by-Line Adjudication**: Our engine evaluates claims at the `LineItem` granularity. This supports partial approvals (e.g., approving the blood test but denying the un-covered dental exam within the same hospital visit).
- **Human-Readable Explanations**: The engine auto-generates sentence-based `explanation` strings explaining the math behind the decision (e.g., *"CONSULTATION covered at 80% up to $300. Deductible applied: $100. Approved: $20 of $150 billed."*).

## What We Didn't Build (Trade-offs / Assumptions)

- **Authentication & Authorization**: We assumed this is an internal processor tool running on a trusted network. Adding JWT/Session management would have bloated the scope without showcasing core domain logic.
- **Complex Hierarchical Coverage rules**: In reality, family policies pool deductibles together, and limits have tiered in-network vs out-of-network variants. We assumed a simplified 1:1 Member:Policy single-tier model.
- **Concurrency / Locking**: Our Limit-Tracking relies on SQL `SUM()` aggregations of past claims. If two claims for the same user limit hit the adjudication engine simultaneously, a race condition could approve both. In a real system, we would wrap adjudication in a `SERIALIZABLE` transaction or use pessimistic row locking.
- **Frontend Form Validation**: We focused heavy validation on the backend API using `Joi`. The React frontend is relatively simple and lacks robust validation libraries (like `zod` + `react-hook-form`).

## AI Collaboration Approach
We utilized an agentic workflow to heavily iterate on the architecture. Initially, we suffered severe `Cannot access before initialization` crashes due to circular dependencies caused by class-based `@provideSingleton` decorators inside InversifyJS. We refactored to use `Symbol` tokens (defined in `ioc/types.ts`) and manual barrel importing to cleanly resolve dependency load orders.
