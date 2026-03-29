# Claims Processing System — Context Document

> **Last Updated:** 2026-03-29  
> **Purpose:** Keep all agents and contributors aligned on scope, architecture, and progress.

---

## 1. Project Overview

An insurance **Claims Processing System** for a Forward Deployed Engineer take-home assignment. Members submit claims for reimbursement; the system adjudicates each line item against coverage rules, tracks claims through a lifecycle state machine, and explains every decision.

### Key Signals Being Evaluated
- **Domain decomposition** — clean modeling of policies, claims, coverage rules
- **Rule representation** — how coverage logic is structured
- **State management** — claim + line item lifecycles
- **Edge case thinking** — partial approvals, limit exhaustion
- **Explanation capability** — system says WHY something was denied

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | nx (minimal config) |
| Backend Runtime | Node.js + TypeScript |
| Backend Framework | Express.js + InversifyJS (IoC) |
| ORM | Sequelize (PostgreSQL) |
| Validation | Joi |
| Logging | Winston |
| Frontend | Next.js (React) |
| Testing | Jest |

---

## 3. Monorepo Structure

```
claims_processing_system/
├── apps/
│   ├── backend/                    # Express + Inversify + Sequelize
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point
│   │   │   ├── bootstrap.ts        # Server wiring
│   │   │   ├── ioc/                # InversifyJS container
│   │   │   ├── controllers/        # HTTP layer
│   │   │   ├── services/           # Business logic
│   │   │   ├── repositories/       # Data access (DAL)
│   │   │   ├── models/             # Sequelize models
│   │   │   ├── validators/         # Joi schemas
│   │   │   ├── constants/          # App constants
│   │   │   ├── db-initialization/  # DB connection
│   │   │   ├── seed/               # Demo seed data
│   │   │   └── utils/              # Logger, errors, helpers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── project.json            # nx project config
│   └── frontend/                   # Next.js app
│       ├── src/
│       │   ├── app/                # Next.js App Router pages
│       │   ├── components/         # React components
│       │   └── lib/                # API client, utils
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.ts
├── libs/
│   └── shared/                     # Shared code across apps
│       ├── enums/
│       ├── interfaces/
│       └── constants/
├── docs/
│   ├── domain-model.md
│   ├── decisions.md
│   └── self-review.md
├── ai-artifacts/
├── nx.json
├── tsconfig.base.json
├── package.json                    # Workspace root
├── .env
└── README.md
```

---

## 4. Domain Model

### Entities

| Entity | Description |
|--------|-------------|
| **Member** | Person insured under a policy |
| **Policy** | Insurance contract with coverage terms, deductible, max benefit |
| **CoverageRule** | Per-service-type rule: covered?, %, max amount, limit period |
| **Claim** | Submitted reimbursement request with provider/diagnosis info |
| **LineItem** | Individual service within a claim, independently adjudicated |

### Relationships
```
Member 1──1 Policy 1──* CoverageRule
  │                │
  │                └──* Claim 1──* LineItem
  └────────────────────┘
```

### State Machines

**Claim States:**
```
SUBMITTED → UNDER_REVIEW → APPROVED ──→ PAID
                         → PARTIALLY_APPROVED → PAID
                         → DENIED
Any non-PAID state ──→ DISPUTED → UNDER_REVIEW (re-adjudicate)
PAID / DENIED / CLOSED are terminal
```

**Line Item States:**
```
PENDING → APPROVED (with approved_amount + explanation)
        → DENIED (with denial_reason + explanation)
        → UNDER_REVIEW (needs manual review, e.g. pre-auth required)
```

---

## 5. Adjudication Engine Logic

The core business logic evaluates each line item:

1. **Policy validation** — Is the policy active? Does date_of_service fall within effective/expiration?
2. **Coverage lookup** — Find CoverageRule matching the line item's `service_type`
3. **Coverage check** — If `is_covered = false` → DENY with `NOT_COVERED`
4. **Pre-auth check** — If `requires_pre_auth = true` → flag `UNDER_REVIEW`
5. **Amount calculation** — `approved = min(billed, max_amount) × coverage_percentage`
6. **Limit tracking** — Sum previously approved amounts for same service type within the limit period. If adding this amount exceeds `max_amount` → DENY with `LIMIT_EXCEEDED` (or approve partial remaining)
7. **Deductible** — Track annual deductible usage. First claims reduce payable by remaining deductible.
8. **Explanation** — Every line item gets a human-readable explanation string

After all line items:
- All approved → `APPROVED`
- Mix of approved/denied → `PARTIALLY_APPROVED`
- All denied → `DENIED`

---

## 6. API Endpoints

### Members
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/members` | Create member |
| GET | `/api/v1/members` | List members |
| GET | `/api/v1/members/:id` | Get member with policy |

### Policies
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/policies` | Create policy with coverage rules |
| GET | `/api/v1/policies` | List policies |
| GET | `/api/v1/policies/:id` | Get policy with rules |

### Claims
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/claims` | Submit claim with line items |
| GET | `/api/v1/claims` | List claims (filterable) |
| GET | `/api/v1/claims/:id` | Get claim detail with adjudication results |
| POST | `/api/v1/claims/:id/adjudicate` | Trigger adjudication |
| POST | `/api/v1/claims/:id/transition` | State transition |
| POST | `/api/v1/claims/:id/dispute` | Dispute decision |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/seed` | Seed demo data |

---

## 7. Implementation Progress

### ✅ Completed
- Project scaffolding & tooling
- Monorepo restructure (apps/backend, apps/frontend, libs/shared)
- Shared enums, interfaces, constants with @claims/shared/* aliases
- PostgreSQL DB initialization with model auto-registration
- InversifyJS IoC container with auto-discovery (Symbol-based DI tokens)
- Health check endpoint
- Logger & error utilities
- **5 Sequelize models**: Member, Policy, CoverageRule, Claim, LineItem (with associations)
- **3 DAL repositories**: MemberDal, PolicyDal, ClaimDal (with limit-tracking queries)
- **4 Services**: MemberService, PolicyService, ClaimService, AdjudicationService
- **AdjudicationService**: Coverage rule evaluation, limit tracking, deductible application, partial approvals, denial explanations
- **Claim state machine**: SUBMITTED → UNDER_REVIEW → APPROVED/PARTIALLY_APPROVED/DENIED → PAID → CLOSED + DISPUTED flow
- **4 Controllers**: MemberController, PolicyController, ClaimController, SeedController (12+ REST endpoints)
- **Joi validators** for all endpoints
- **Seed data**: 2 members, 2 policies (Standard/Premium), 16 coverage rules
- **Next.js frontend**: Dashboard, Claims List, Submit Claim, Claim Detail, Policy Viewer
- **Context document** (CONTEXT.md) and architecture HTML visualization
- **End-to-end runtime verification**: 51/51 API tests passing, UI e2e flows successfully verified
- **Required submission docs**: domain-model.md, decisions.md, self-review.md

###  🔲 Not Started
- None. System is 100% complete and verified.

---

## 8. Conventions

- **File naming**: PascalCase for classes (e.g., `ClaimService.ts`), camelCase for utilities
- **Controllers**: Use `@controller` decorator, extend `BaseController`
- **Services**: Use `@provideSingleton` decorator, extend `BaseService`
- **Repositories**: Use `@provideSingleton`, named `*Dal.ts` (Data Access Layer)
- **Models**: Export a class factory + model schema definition
- **Barrel files**: Each directory has `index.ts` for re-exports
- **Errors**: Use `AppError` static factories (`AppError.notFound()`, etc.)
- **DB columns**: Use `snake_case`, Sequelize `underscored: true`
