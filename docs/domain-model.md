# Domain Model Documentation

## Entities and Relationships

We decomposed the insurance domain into 5 core abstractions:

1. **Member**: The person insured.
2. **Policy**: The insurance contract bound to a Member. Tracks the `annual_deductible` and `annual_max_benefit`.
3. **CoverageRule**: The granular rules defining what the Policy pays for. There is a `1:N` relationship between a Policy and CoverageRules.
4. **Claim**: The reimbursement request submitted against a Policy.
5. **LineItem**: The individual services provided during the Claim visit.

### Why this decomposition?
By splitting **Claim** and **LineItem**, we support *partial approvals*. An insurance system rarely approves or denies an entire document; it evaluates each CPT/service code individually.
By splitting **Policy** and **CoverageRule**, we create a dynamic data-driven rule engine. Instead of hardcoding "DENTAL is not covered", the system checks if a `CoverageRule` where `service_type='DENTAL'` exists and if `is_covered=true`.

## Coverage Rule Representation
Coverage Rules are modeled as rows in the `coverage_rules` database table with the following crucial fields:
- `service_type` (ENUM): e.g., CONSULTATION, PROCEDURE, DENTAL.
- `is_covered` (BOOLEAN): Hard exclusions.
- `coverage_percentage` (DECIMAL): e.g., 80 for 80%.
- `max_amount` (DECIMAL): The dollar limit.
- `limit_period` (ENUM): Validates against ANNUAL, PER_VISIT, or LIFETIME.
- `requires_pre_auth` (BOOLEAN): If true, forces manual review.

**Application Logic**: The `AdjudicationService` loops over every `LineItem`. It fetches the matching `CoverageRule`. It multiplies the `billed_amount` by the `coverage_percentage` (capped at `max_amount`). It then runs historical limit-tracking queries (e.g., "what is the sum of approved DENTAL items this year?") to ensure limits aren't breached. Finally, it subtracts any remaining `annual_deductible` off the final payable amount.

## State Machines

### Claim State Machine
Claims follow a strict directed graph enforced by `ClaimService.transitionState()`:
```
SUBMITTED → UNDER_REVIEW → APPROVED | PARTIALLY_APPROVED | DENIED
(APPROVED | PARTIALLY_APPROVED) → PAID
PAID → CLOSED
(APPROVED | PARTIALLY_APPROVED | DENIED) → DISPUTED
DISPUTED → UNDER_REVIEW (re-adjudication loop)
```

### Line Item State Machine
Line items operate independently to feed the overarching Claim status:
```
PENDING → APPROVED (with exact approved_amount)
PENDING → DENIED (with specific DenialReason enum like LIMIT_EXCEEDED or NOT_COVERED)
PENDING → UNDER_REVIEW (when pre-auth is flagged)
```
